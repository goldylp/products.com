const getMockRates = (weight) => [
  { service: 'UPS Ground', code: '03', price: parseFloat((9.99 + weight * 0.4).toFixed(2)), days: '5-7 business days' },
  { service: 'UPS 3 Day Select', code: '12', price: parseFloat((19.99 + weight * 0.4).toFixed(2)), days: '3 business days' },
  { service: 'UPS 2nd Day Air', code: '02', price: parseFloat((29.99 + weight * 0.4).toFixed(2)), days: '2 business days' },
  { service: 'UPS Next Day Air', code: '01', price: parseFloat((49.99 + weight * 0.4).toFixed(2)), days: '1 business day' }
];

const getShippingRates = async (items, address) => {
  if (!items || items.length === 0) {
    throw new Error('No items in cart');
  }

  if (!address || !address.country || !address.state || !address.city || !address.zipCode) {
    throw new Error('Complete shipping address required');
  }

  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1) * item.quantity, 0);
  const packageWeight = String(Math.max(1, Math.ceil(totalWeight)));

  const UPS_ACCESS_KEY = process.env.UPS_ACCESS_KEY;
  const UPS_USERNAME = process.env.UPS_USERNAME;
  const UPS_PASSWORD = process.env.UPS_PASSWORD;
  const UPS_SHIPPER_NUMBER = process.env.UPS_SHIPPER_NUMBER || '';

  if (!UPS_ACCESS_KEY || !UPS_USERNAME || !UPS_PASSWORD) {
    return { rates: getMockRates(totalWeight), weight: totalWeight, mock: true };
  }

  const countryCodes = {
    'United States': 'US',
    'Canada': 'CA',
    'United Kingdom': 'GB',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'India': 'IN'
  };
  const destCountry = countryCodes[address.country] || address.country;

  const xmlRequest = `<?xml version="1.0"?>
<AccessRequest xml:lang="en-US">
  <AccessLicenseNumber>${UPS_ACCESS_KEY}</AccessLicenseNumber>
  <UserId>${UPS_USERNAME}</UserId>
  <Password>${UPS_PASSWORD}</Password>
</AccessRequest>
<?xml version="1.0"?>
<RatingServiceSelectionRequest xml:lang="en-US">
  <Request>
    <TransactionReference>
      <CustomerContext>HealthFuel Rate Request</CustomerContext>
    </TransactionReference>
    <RequestAction>Rate</RequestAction>
    <RequestOption>Shop</RequestOption>
  </Request>
  <PickupType>
    <Code>03</Code>
  </PickupType>
  <Shipment>
    <Shipper>
      <Name>HealthFuel Store</Name>
      <ShipperNumber>${UPS_SHIPPER_NUMBER}</ShipperNumber>
      <Address>
        <AddressLine1>123 Store St</AddressLine1>
        <City>Los Angeles</City>
        <StateProvinceCode>CA</StateProvinceCode>
        <PostalCode>90001</PostalCode>
        <CountryCode>US</CountryCode>
      </Address>
    </Shipper>
    <ShipTo>
      <CompanyName>Customer</CompanyName>
      <Address>
        <AddressLine1>${address.addressLine1 || ''}</AddressLine1>
        <City>${address.city}</City>
        <StateProvinceCode>${address.state}</StateProvinceCode>
        <PostalCode>${address.zipCode}</PostalCode>
        <CountryCode>${destCountry}</CountryCode>
      </Address>
    </ShipTo>
    <ShipFrom>
      <CompanyName>HealthFuel Store</CompanyName>
      <Address>
        <AddressLine1>123 Store St</AddressLine1>
        <City>Los Angeles</City>
        <StateProvinceCode>CA</StateProvinceCode>
        <PostalCode>90001</PostalCode>
        <CountryCode>US</CountryCode>
      </Address>
    </ShipFrom>
    <Package>
      <PackagingType>
        <Code>02</Code>
      </PackagingType>
      <PackageWeight>
        <UnitOfMeasurement>
          <Code>LBS</Code>
        </UnitOfMeasurement>
        <Weight>${packageWeight}</Weight>
      </PackageWeight>
    </Package>
  </Shipment>
</RatingServiceSelectionRequest>`;

  try {
    const upsResponse = await fetch('https://wwwcie.ups.com/ups.app/xml/Rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: xmlRequest
    });

    const xmlText = await upsResponse.text();
    const responseCode = xmlText.match(/<ResponseStatusCode>(\d+)<\/ResponseStatusCode>/)?.[1];

    if (responseCode !== '1') {
      return { rates: getMockRates(totalWeight), weight: totalWeight, mock: true };
    }

    const serviceNames = {
      '01': 'UPS Next Day Air',
      '02': 'UPS 2nd Day Air',
      '03': 'UPS Ground',
      '12': 'UPS 3 Day Select',
      '13': 'UPS Next Day Air Saver',
      '14': 'UPS Next Day Air Early',
      '59': 'UPS 2nd Day Air A.M.',
      '65': 'UPS Worldwide Saver',
      '07': 'UPS Worldwide Express',
      '08': 'UPS Worldwide Expedited',
      '11': 'UPS Standard'
    };

    const shipmentBlocks = xmlText.match(/<RatedShipment>[\s\S]*?<\/RatedShipment>/g) || [];
    if (shipmentBlocks.length === 0) {
      return { rates: getMockRates(totalWeight), weight: totalWeight, mock: true };
    }

    const rates = shipmentBlocks.map((block) => {
      const code = block.match(/<Service>[\s\S]*?<Code>(.*?)<\/Code>/)?.[1];
      const price = parseFloat(block.match(/<TotalCharges>[\s\S]*?<MonetaryValue>(.*?)<\/MonetaryValue>/)?.[1] || '0');
      const days = block.match(/<BusinessTransitDays>(\d+)<\/BusinessTransitDays>/)?.[1];

      return {
        service: serviceNames[code] || `UPS Service ${code}`,
        code,
        price,
        days: days ? `${days} business day${days > 1 ? 's' : ''}` : 'Varies'
      };
    }).filter((rate) => rate.price > 0);

    rates.sort((a, b) => a.price - b.price);
    return { rates, weight: totalWeight, mock: false };
  } catch (err) {
    console.error('Shipping rate error:', err.message);
    return { rates: getMockRates(totalWeight || 1), weight: totalWeight || 1, mock: true };
  }
};

module.exports = {
  getMockRates,
  getShippingRates
};
