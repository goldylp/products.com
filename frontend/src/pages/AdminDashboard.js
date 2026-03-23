import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useAdminAuth } from '../context/AdminAuthContext';
import PasswordToggleIcon from '../components/PasswordToggleIcon';
import logo from '../images/logo.png';
import { getApiUrl } from '../utils/api';
import { isNonEmpty, isNonNegativeNumber, isPositiveNumber, isValidEmail, isValidImageReference } from '../utils/validation';

const PRODUCT_FORM_INITIAL = {
  _id: '',
  name: '',
  image: '',
  price: '',
  weight: '',
  category: 'General',
  badge: '',
  description: '',
  stock: '',
  isActive: true
};

const CUSTOMER_FORM_INITIAL = { _id: '', name: '', email: '' };
const ADMIN_USER_FORM_INITIAL = { _id: '', name: '', email: '', password: '', role: 'admin', profileImage: '' };

const TAB_TITLES = {
  dashboard: 'Dashboard',
  products: 'Manage Products',
  customers: 'Manage Customers',
  orders: 'Manage Orders',
  users: 'Manage Users',
  leads: 'Manage Leads'
};

const ADMIN_SECTION_PATHS = {
  dashboard: '/dashboard',
  products: '/products',
  customers: '/customers',
  orders: '/orders',
  users: '/users',
  leads: '/leads'
};

const TABLE_PAGE_SIZE = 10;
const PRODUCT_CATEGORY_OPTIONS = ['General', 'Protein', 'Pre-Workout', 'Performance', 'Vitamins', 'Recovery'];
const PRODUCT_BADGE_OPTIONS = [
  { value: '', label: 'No Badge' },
  { value: 'BEST SELLER', label: 'Best Seller' },
  { value: 'NEW', label: 'New' },
  { value: 'SALE', label: 'Sale' }
];

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const getInitials = (name = 'Admin') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A';
const shortId = (id = '') => id.slice(-8).toUpperCase();
const formatRoleLabel = (role = '') => role.split('_').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Admin';
const normalizeSearchValue = (value) => String(value ?? '').toLowerCase().trim();

const upsertById = (items, nextItem) => {
  const existingIndex = items.findIndex((item) => item._id === nextItem._id);
  if (existingIndex === -1) {
    return [nextItem, ...items];
  }

  const nextItems = [...items];
  nextItems[existingIndex] = { ...nextItems[existingIndex], ...nextItem };
  return nextItems;
};

const buildRecordLabel = (tab, id) => {
  const prefixes = {
    products: 'Product',
    customers: 'Customer',
    orders: 'Order',
    users: 'Admin'
  };

  return `${prefixes[tab] || 'Record'} #${shortId(id)}`;
};

const adminSwal = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: 'admin-swal-popup',
    title: 'admin-swal-title',
    htmlContainer: 'admin-swal-text',
    actions: 'admin-swal-actions',
    confirmButton: 'admin-primary-btn admin-swal-confirm',
    cancelButton: 'admin-secondary-btn admin-swal-cancel'
  }
});

const adminToast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  customClass: {
    popup: 'admin-swal-toast',
    title: 'admin-swal-toast-title'
  }
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, loading: authLoading, logoutAdmin, updateAdminUser, getAdminAuthHeader } = useAdminAuth();
  const adminUserId = adminUser?._id;
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [showAdminUserPassword, setShowAdminUserPassword] = useState(false);
  const [tablePages, setTablePages] = useState({
    products: 1,
    customers: 1,
    orders: 1,
    users: 1
  });
  const [tableSearchQueries, setTableSearchQueries] = useState({
    products: '',
    customers: '',
    orders: '',
    users: '',
    leads: ''
  });

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadFilters, setLeadFilters] = useState({
    campaign: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [leadCampaigns, setLeadCampaigns] = useState([]);

  const [productForm, setProductForm] = useState(PRODUCT_FORM_INITIAL);
  const [customerForm, setCustomerForm] = useState(CUSTOMER_FORM_INITIAL);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adminUserForm, setAdminUserForm] = useState(ADMIN_USER_FORM_INITIAL);
  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeTab = pathParts[0] || 'dashboard';
  const routeRecordId = pathParts[1] || null;
  const currentTabView = activeTab === 'dashboard'
    ? null
    : {
      mode: routeRecordId ? (routeRecordId === 'new' ? 'new' : activeTab === 'orders' ? 'view' : 'edit') : 'list',
      recordId: routeRecordId === 'new' ? null : routeRecordId,
      label: routeRecordId && routeRecordId !== 'new'
        ? buildRecordLabel(activeTab, routeRecordId)
        : null
    };

  useEffect(() => {
    if (!authLoading && !adminUser) {
      navigate('/admin/login');
    }
  }, [adminUser, authLoading, navigate]);

  useEffect(() => {
    if (!['dashboard', 'products', 'customers', 'orders', 'users', 'leads'].includes(activeTab)) {
      navigate('/dashboard', { replace: true });
    }
  }, [activeTab, navigate]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [activeTab]);

  const adminFetch = useCallback(async (path, options = {}) => {
    const response = await fetch(getApiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
        ...(options.headers || {})
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [getAdminAuthHeader]);

  const loadAdminData = useCallback(async () => {
    if (!adminUserId) return;

    setInitialLoading(true);
    try {
      const [productsData, customersData, ordersData, adminUsersData, leadsData] = await Promise.all([
        adminFetch('/api/admin/products'),
        adminFetch('/api/admin/customers'),
        adminFetch('/api/admin/orders'),
        adminFetch('/api/admin/users'),
        adminFetch('/api/leads')
      ]);

      console.log('Leads data:', leadsData);
      setProducts(productsData);
      setCustomers(customersData);
      setOrders(ordersData);
      setAdminUsers(adminUsersData);
      setLeads(leadsData?.leads || leadsData || []);
      setLeadCampaigns(leadsData?.filters?.campaigns || []);
      setError('');
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setInitialLoading(false);
    }
  }, [adminFetch, adminUserId]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const stats = useMemo(() => ({
    products: products.length,
    customers: customers.length,
    orders: orders.length,
    revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  }), [products, customers, orders]);

  const filteredProducts = useMemo(() => {
    const query = normalizeSearchValue(tableSearchQueries.products);
    if (!query) return products;

    return products.filter((product) => (
      [
        product.name,
        product.category,
        product.badge,
        product.description,
        product.price,
        product.stock
      ].some((value) => normalizeSearchValue(value).includes(query))
    ));
  }, [products, tableSearchQueries.products]);

  const filteredCustomers = useMemo(() => {
    const query = normalizeSearchValue(tableSearchQueries.customers);
    if (!query) return customers;

    return customers.filter((customer) => (
      [
        customer.name,
        customer.email,
        customer.orderCount,
        customer.totalSpent,
        customer.cartCount
      ].some((value) => normalizeSearchValue(value).includes(query))
    ));
  }, [customers, tableSearchQueries.customers]);

  const filteredOrders = useMemo(() => {
    const query = normalizeSearchValue(tableSearchQueries.orders);
    if (!query) return orders;

    return orders.filter((order) => (
      [
        order._id,
        shortId(order._id),
        order.customerEmail,
        order.customerPhone,
        order.status,
        order.total,
        order.shippingMethod,
        order.shippingAddress?.fullName
      ].some((value) => normalizeSearchValue(value).includes(query))
    ));
  }, [orders, tableSearchQueries.orders]);

  const filteredAdminUsers = useMemo(() => {
    const query = normalizeSearchValue(tableSearchQueries.users);
    if (!query) return adminUsers;

    return adminUsers.filter((user) => (
      [
        user.name,
        user.email,
        user.role,
        formatRoleLabel(user.role)
      ].some((value) => normalizeSearchValue(value).includes(query))
    ));
  }, [adminUsers, tableSearchQueries.users]);

  const filteredLeads = useMemo(() => {
    const query = normalizeSearchValue(tableSearchQueries.leads);
    let result = leads;

    if (leadFilters.campaign) {
      result = result.filter(l => l.utm_campaign === leadFilters.campaign);
    }
    if (leadFilters.status) {
      result = result.filter(l => l.status === leadFilters.status);
    }
    if (leadFilters.startDate) {
      const start = new Date(leadFilters.startDate);
      result = result.filter(l => new Date(l.createdAt) >= start);
    }
    if (leadFilters.endDate) {
      const end = new Date(leadFilters.endDate + 'T23:59:59');
      result = result.filter(l => new Date(l.createdAt) <= end);
    }
    if (query) {
      result = result.filter((lead) => (
        [
          lead.name,
          lead.email,
          lead.phone,
          lead.utm_campaign,
          lead.source
        ].some((value) => normalizeSearchValue(value).includes(query))
      ));
    }

    return result;
  }, [leads, leadFilters, tableSearchQueries.leads]);

  useEffect(() => {
    setTablePages((prev) => {
      const next = {
        products: Math.min(prev.products, Math.max(1, Math.ceil(filteredProducts.length / TABLE_PAGE_SIZE))),
        customers: Math.min(prev.customers, Math.max(1, Math.ceil(filteredCustomers.length / TABLE_PAGE_SIZE))),
        orders: Math.min(prev.orders, Math.max(1, Math.ceil(filteredOrders.length / TABLE_PAGE_SIZE))),
        users: Math.min(prev.users, Math.max(1, Math.ceil(filteredAdminUsers.length / TABLE_PAGE_SIZE))),
        leads: Math.min(prev.leads, Math.max(1, Math.ceil(filteredLeads.length / TABLE_PAGE_SIZE)))
      };

      const changed = Object.keys(next).some((key) => next[key] !== prev[key]);
      return changed ? next : prev;
    });
  }, [filteredProducts.length, filteredCustomers.length, filteredOrders.length, filteredAdminUsers.length, filteredLeads.length]);

  const resetNotifications = () => {
    setError('');
  };

  const showSuccessAlert = useCallback((text) => {
    adminToast.fire({ icon: 'success', title: text });
  }, []);

  const showErrorAlert = useCallback((text, title = 'Action failed') => {
    adminSwal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'OK'
    });
  }, []);

  const showValidationAlert = useCallback((text) => {
    adminSwal.fire({
      icon: 'warning',
      title: 'Please check the form',
      text,
      confirmButtonText: 'OK'
    });
  }, []);

  const getPaginationMeta = (tab, items) => {
    const totalPages = Math.max(1, Math.ceil(items.length / TABLE_PAGE_SIZE));
    const currentPage = Math.min(tablePages[tab] || 1, totalPages);
    const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;

    return {
      currentPage,
      totalPages,
      items: items.slice(startIndex, startIndex + TABLE_PAGE_SIZE),
      startEntry: items.length ? startIndex + 1 : 0,
      endEntry: Math.min(startIndex + TABLE_PAGE_SIZE, items.length),
      totalEntries: items.length
    };
  };

  const setTablePage = (tab, page) => {
    setTablePages((prev) => ({ ...prev, [tab]: page }));
  };

  const setTableSearchQuery = (tab, value) => {
    setTableSearchQueries((prev) => ({ ...prev, [tab]: value }));
    setTablePages((prev) => ({ ...prev, [tab]: 1 }));
  };

  const renderPagination = (tab, paginationMeta) => {
    const { currentPage, totalPages, startEntry, endEntry, totalEntries } = paginationMeta;

    if (totalEntries <= TABLE_PAGE_SIZE) {
      return null;
    }

    const visibleCount = Math.min(3, totalPages);
    const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - visibleCount + 1));
    const pageNumbers = Array.from({ length: visibleCount }, (_, index) => startPage + index);

    return (
      <div className="admin-pagination">
        <span className="admin-pagination-info">
          Showing {startEntry}-{endEntry} of {totalEntries}
        </span>
        <div className="admin-pagination-controls">
          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setTablePage(tab, currentPage - 1)}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`admin-pagination-btn${pageNumber === currentPage ? ' active' : ''}`}
              onClick={() => setTablePage(tab, pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setTablePage(tab, currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderTableSearch = (tab, placeholder, actionButton = null) => (
    <div className="admin-table-toolbar">
      {actionButton}
      <input
        type="search"
        className="admin-table-search"
        placeholder={placeholder}
        value={tableSearchQueries[tab]}
        onChange={(e) => setTableSearchQuery(tab, e.target.value)}
      />
    </div>
  );

  useEffect(() => {
    if (activeTab !== 'products') return;

    if (currentTabView?.mode === 'new') {
      setProductForm(PRODUCT_FORM_INITIAL);
      return;
    }

    if (currentTabView?.recordId) {
      const product = products.find((item) => item._id === currentTabView.recordId);
      if (product) {
        setProductForm({ ...PRODUCT_FORM_INITIAL, ...product });
      }
    }
  }, [activeTab, currentTabView?.mode, currentTabView?.recordId, products]);

  useEffect(() => {
    if (activeTab !== 'customers') return;

    if (currentTabView?.recordId) {
      const customer = customers.find((item) => item._id === currentTabView.recordId);
      if (customer) {
        setCustomerForm({ _id: customer._id, name: customer.name, email: customer.email });
      }
    } else {
      setCustomerForm(CUSTOMER_FORM_INITIAL);
    }
  }, [activeTab, currentTabView?.recordId, customers]);

  useEffect(() => {
    if (activeTab !== 'orders') return;

    if (currentTabView?.recordId) {
      const order = orders.find((item) => item._id === currentTabView.recordId) || null;
      setSelectedOrder(order);
    } else {
      setSelectedOrder(null);
    }
  }, [activeTab, currentTabView?.recordId, orders]);

  useEffect(() => {
    if (activeTab !== 'users') return;

    if (currentTabView?.mode === 'new') {
      setAdminUserForm(ADMIN_USER_FORM_INITIAL);
      setShowAdminUserPassword(false);
      return;
    }

    if (currentTabView?.recordId) {
      const user = adminUsers.find((item) => item._id === currentTabView.recordId);
      if (user) {
        setShowAdminUserPassword(false);
        setAdminUserForm({
          _id: user._id,
          name: user.name,
          email: user.email,
          password: '',
          role: user.role,
          profileImage: user.profileImage || ''
        });
      }
    }
  }, [activeTab, currentTabView?.mode, currentTabView?.recordId, adminUsers]);

  const setListView = (tab) => {
    navigate(ADMIN_SECTION_PATHS[tab]);
  };

  const openNewView = (tab) => {
    navigate(`${ADMIN_SECTION_PATHS[tab]}/new`);
  };

  const openEditView = (tab, record) => {
    navigate(`${ADMIN_SECTION_PATHS[tab]}/${record._id}`);
  };

  const openOrderView = (order) => {
    setSelectedOrder(order);
    navigate(`/orders/${order._id}`);
  };

  const uploadImage = useCallback(async (file, folder) => {
    const imageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read the selected file'));
      reader.readAsDataURL(file);
    });

    const data = await adminFetch('/api/admin/upload-image', {
      method: 'POST',
      body: JSON.stringify({
        imageData,
        fileName: file.name,
        folder
      })
    });

    return data.imageUrl;
  }, [adminFetch]);

  const handleProductImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetNotifications();
    setUploadingField('product');
    try {
      const imageUrl = await uploadImage(file, 'product');
      setProductForm((prev) => ({ ...prev, image: imageUrl }));
      showSuccessAlert('Product image uploaded successfully.');
    } catch (err) {
      showErrorAlert(err.message);
    } finally {
      setUploadingField('');
      event.target.value = '';
    }
  };

  const handleAdminImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetNotifications();
    setUploadingField('admin');
    try {
      const imageUrl = await uploadImage(file, 'admin');
      setAdminUserForm((prev) => ({ ...prev, profileImage: imageUrl }));
      showSuccessAlert('Admin profile image uploaded successfully.');
    } catch (err) {
      showErrorAlert(err.message);
    } finally {
      setUploadingField('');
      event.target.value = '';
    }
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    logoutAdmin();
    navigate('/admin/login');
  };

  const handleDelete = async (resource, id, successMessage) => {
    resetNotifications();
    const result = await adminSwal.fire({
      icon: 'warning',
      title: 'Are you sure you want to delete this record?',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await adminFetch(`/api/admin/${resource}/${id}`, { method: 'DELETE' });
      if (resource === 'products') {
        setProducts((prev) => prev.filter((item) => item._id !== id));
        if (activeTab === 'products' && currentTabView?.recordId === id) {
          navigate('/products');
        }
      } else if (resource === 'customers') {
        setCustomers((prev) => prev.filter((item) => item._id !== id));
        if (activeTab === 'customers' && currentTabView?.recordId === id) {
          navigate('/customers');
        }
      } else if (resource === 'users') {
        setAdminUsers((prev) => prev.filter((item) => item._id !== id));
        if (activeTab === 'users' && currentTabView?.recordId === id) {
          navigate('/users');
        }
      }
      showSuccessAlert(successMessage);
    } catch (err) {
      showErrorAlert(err.message);
    }
  };

  const toggleProductStatus = async (product) => {
    resetNotifications();

    try {
      const updatedProduct = await adminFetch(`/api/admin/products/${product._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !product.isActive })
      });
      setProducts((prev) => upsertById(prev, updatedProduct));
      if (productForm._id === updatedProduct._id) {
        setProductForm((prev) => ({ ...prev, ...updatedProduct }));
      }
      showSuccessAlert(`Product ${product.isActive ? 'disabled' : 'enabled'} successfully.`);
    } catch (err) {
      showErrorAlert(err.message);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    resetNotifications();

    if (!isNonEmpty(productForm.name)) {
      showValidationAlert('Product name is required');
      return;
    }
    if (!isNonEmpty(productForm.image)) {
      showValidationAlert('Image URL is required');
      return;
    }
    if (!isValidImageReference(productForm.image)) {
      showValidationAlert('Please provide a valid image URL or uploaded image path');
      return;
    }
    if (!isPositiveNumber(productForm.price)) {
      showValidationAlert('Price must be greater than 0');
      return;
    }
    if (productForm.weight !== '' && !isPositiveNumber(productForm.weight)) {
      showValidationAlert('Weight must be greater than 0');
      return;
    }
    if (productForm.stock !== '' && !isNonNegativeNumber(productForm.stock)) {
      showValidationAlert('Stock cannot be negative');
      return;
    }

    const payload = {
      ...productForm,
      name: productForm.name.trim(),
      image: productForm.image.trim(),
      price: Number(productForm.price),
      weight: Number(productForm.weight || 1),
      category: productForm.category.trim(),
      badge: productForm.badge,
      description: productForm.description.trim(),
      stock: Number(productForm.stock || 0)
    };

    try {
      let savedProduct;
      if (productForm._id) {
        savedProduct = await adminFetch(`/api/admin/products/${productForm._id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setProducts((prev) => upsertById(prev, savedProduct));
        showSuccessAlert('Product updated successfully.');
      } else {
        savedProduct = await adminFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        setProducts((prev) => [savedProduct, ...prev]);
        showSuccessAlert('Product created successfully.');
      }

      setProductForm({ ...PRODUCT_FORM_INITIAL, ...savedProduct });
      navigate('/products', { replace: true });
    } catch (err) {
      showErrorAlert(err.message);
    }
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    resetNotifications();

    if (!isNonEmpty(customerForm.name)) {
      showValidationAlert('Customer name is required');
      return;
    }
    if (!isValidEmail(customerForm.email)) {
      showValidationAlert('Please enter a valid email address');
      return;
    }

    try {
      const updatedCustomer = await adminFetch(`/api/admin/customers/${customerForm._id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: customerForm.name.trim(), email: customerForm.email.trim() })
      });

      setCustomers((prev) => prev.map((customer) => (
        customer._id === updatedCustomer._id
          ? { ...customer, ...updatedCustomer }
          : customer
      )));
      setCustomerForm({ _id: updatedCustomer._id, name: updatedCustomer.name, email: updatedCustomer.email });
      navigate('/customers', { replace: true });
      showSuccessAlert('Customer updated successfully.');
    } catch (err) {
      showErrorAlert(err.message);
    }
  };

  const saveAdminUser = async (e) => {
    e.preventDefault();
    resetNotifications();

    if (!isNonEmpty(adminUserForm.name)) {
      showValidationAlert('Admin user name is required');
      return;
    }
    if (!isValidEmail(adminUserForm.email)) {
      showValidationAlert('Please enter a valid email address');
      return;
    }
    if (!adminUserForm._id && adminUserForm.password.length < 6) {
      showValidationAlert('Password must be at least 6 characters');
      return;
    }
    if (adminUserForm.password && adminUserForm.password.length < 6) {
      showValidationAlert('Password must be at least 6 characters');
      return;
    }
    if (adminUserForm.profileImage && !isValidImageReference(adminUserForm.profileImage)) {
      showValidationAlert('Please provide a valid profile image URL or uploaded image path');
      return;
    }

    const payload = {
      name: adminUserForm.name.trim(),
      email: adminUserForm.email.trim(),
      profileImage: adminUserForm.profileImage.trim(),
      role: adminUserForm.role
    };

    if (adminUserForm.password) {
      payload.password = adminUserForm.password;
    }

    try {
      let savedAdmin;
      if (adminUserForm._id) {
        savedAdmin = await adminFetch(`/api/admin/users/${adminUserForm._id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showSuccessAlert('Admin user updated successfully.');
      } else {
        savedAdmin = await adminFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) });
        showSuccessAlert('Admin user created successfully.');
      }

      if (savedAdmin && savedAdmin._id === adminUser?._id) {
        updateAdminUser(savedAdmin);
      }

      if (savedAdmin) {
        setShowAdminUserPassword(false);
        setAdminUsers((prev) => upsertById(prev, savedAdmin));
        setAdminUserForm({
          _id: savedAdmin._id,
          name: savedAdmin.name,
          email: savedAdmin.email,
          password: '',
          role: savedAdmin.role,
          profileImage: savedAdmin.profileImage || ''
        });
        navigate('/users', { replace: true });
      }
    } catch (err) {
      showErrorAlert(err.message);
    }
  };

  const renderProductsSection = () => {
    const isList = currentTabView?.mode === 'list';
    const paginationMeta = getPaginationMeta('products', filteredProducts);

    return (
      <section className="admin-section">
        {!isList && (
          <div className="admin-section-header">
            <button type="button" className="admin-secondary-btn" onClick={() => setListView('products')}>
              Back to Table
            </button>
          </div>
        )}
        {isList ? (
          <div className="admin-table-wrap">
            {renderTableSearch(
              'products',
              'Search Product',
              <button type="button" className="admin-secondary-btn" onClick={() => openNewView('products')}>
                New Product
              </button>
            )}
            {paginationMeta.totalEntries ? (
              <>
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Category</th><th>Badge</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {paginationMeta.items.map((product) => (
                      <tr key={product._id}>
                        <td data-label="Name">{product.name}</td>
                        <td data-label="Category">{product.category || 'General'}</td>
                        <td data-label="Badge">{product.badge || 'None'}</td>
                        <td data-label="Price">{formatMoney(product.price)}</td>
                        <td data-label="Stock">{product.stock}</td>
                        <td data-label="Status">
                          <button
                            type="button"
                            className={`admin-switch${product.isActive ? ' active' : ''}`}
                            onClick={() => toggleProductStatus(product)}
                            aria-label={`${product.isActive ? 'Disable' : 'Enable'} ${product.name}`}
                          >
                            <span className="admin-switch-track">
                              <span className="admin-switch-thumb" />
                            </span>
                          </button>
                        </td>
                        <td data-label="Actions" className="admin-actions-cell">
                          <button type="button" className="table-action-btn" onClick={() => openEditView('products', product)}>Edit</button>
                          <button type="button" className="table-action-btn danger" onClick={() => handleDelete('products', product._id, 'Product deleted successfully.')}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination('products', paginationMeta)}
              </>
            ) : (
              <div className="admin-empty-state">No products matched your search.</div>
            )}
          </div>
        ) : (
          <form className="admin-form-grid" onSubmit={saveProduct}>
            <div className="form-group"><label>Name</label><input value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} required /></div>
            <div className="form-group"><label>Image URL</label><input value={productForm.image} onChange={(e) => setProductForm((prev) => ({ ...prev, image: e.target.value }))} required /></div>
            <div className="form-group">
              <label>Upload Product Image</label>
              <input type="file" accept="image/*" onChange={handleProductImageUpload} />
              <small className="admin-field-hint">{uploadingField === 'product' ? 'Uploading image...' : 'Optional. Uploading will fill the Image URL field automatically.'}</small>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={productForm.category} onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}>
                {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Badge</label>
              <select value={productForm.badge} onChange={(e) => setProductForm((prev) => ({ ...prev, badge: e.target.value }))}>
                {PRODUCT_BADGE_OPTIONS.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group"><label>Price</label><input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))} required /></div>
            <div className="form-group"><label>Weight</label><input type="number" step="0.1" value={productForm.weight} onChange={(e) => setProductForm((prev) => ({ ...prev, weight: e.target.value }))} /></div>
            <div className="form-group"><label>Stock</label><input type="number" value={productForm.stock} onChange={(e) => setProductForm((prev) => ({ ...prev, stock: e.target.value }))} /></div>
            {productForm.image && (
              <div className="admin-image-preview-card">
                <span>Product Preview</span>
                <img src={productForm.image} alt={productForm.name || 'Product preview'} className="admin-image-preview" />
              </div>
            )}
            <div className="form-group full"><label>Description</label><textarea rows="4" value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
            <div className="admin-form-actions"><button type="submit" className="admin-primary-btn">{productForm._id ? 'Update' : 'Save'}</button></div>
          </form>
        )}
      </section>
    );
  };

  const renderCustomersSection = () => {
    const isList = currentTabView?.mode === 'list';
    const paginationMeta = getPaginationMeta('customers', filteredCustomers);

    return (
      <section className="admin-section">
        {!isList && (
          <div className="admin-section-header">
            <button type="button" className="admin-secondary-btn" onClick={() => setListView('customers')}>
              Back to Table
            </button>
          </div>
        )}
        {isList ? (
          <div className="admin-table-wrap">
            {renderTableSearch('customers', 'Search Customer')}
            {paginationMeta.totalEntries ? (
              <>
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Total Spent</th><th>Cart Items</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {paginationMeta.items.map((customer) => (
                      <tr key={customer._id}>
                        <td data-label="Name">{customer.name}</td>
                        <td data-label="Email">{customer.email}</td>
                        <td data-label="Orders">{customer.orderCount}</td>
                        <td data-label="Total Spent">{formatMoney(customer.totalSpent)}</td>
                        <td data-label="Cart Items">{customer.cartCount}</td>
                        <td data-label="Joined">{new Date(customer.createdAt).toLocaleDateString()}</td>
                        <td data-label="Actions" className="admin-actions-cell">
                          <button type="button" className="table-action-btn" onClick={() => openEditView('customers', customer)}>Edit</button>
                          <button type="button" className="table-action-btn danger" onClick={() => handleDelete('customers', customer._id, 'Customer deleted successfully.')}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination('customers', paginationMeta)}
              </>
            ) : (
              <div className="admin-empty-state">No customers matched your search.</div>
            )}
          </div>
        ) : (
          <form className="admin-form-grid compact" onSubmit={saveCustomer}>
            <div className="form-group"><label>Name</label><input value={customerForm.name} onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))} required /></div>
            <div className="form-group"><label>Email</label><input value={customerForm.email} onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))} required /></div>
            <div className="admin-form-actions"><button type="submit" className="admin-primary-btn">{customerForm._id ? 'Update' : 'Save'}</button></div>
          </form>
        )}
      </section>
    );
  };

  const renderOrdersSection = () => {
    const isList = currentTabView?.mode === 'list';
    const paginationMeta = getPaginationMeta('orders', filteredOrders);
    const orderToView = selectedOrder && currentTabView?.recordId === selectedOrder._id
      ? selectedOrder
      : orders.find((order) => order._id === currentTabView?.recordId);

    return (
      <section className="admin-section">
        {!isList && (
          <div className="admin-section-header admin-section-header-spaced">
            <button type="button" className="admin-secondary-btn" onClick={() => setListView('orders')}>
              Back to Table
            </button>
          </div>
        )}
        {isList ? (
          <div className="admin-table-wrap">
            {renderTableSearch('orders', 'Search Order')}
            {paginationMeta.totalEntries ? (
              <>
                <table className="admin-table">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                  <tbody>
                    {paginationMeta.items.map((order) => (
                      <tr key={order._id}>
                        <td data-label="Order ID">#{shortId(order._id)}</td>
                        <td data-label="Customer">{order.customerEmail || 'Guest Checkout'}</td>
                        <td data-label="Total">{formatMoney(order.total)}</td>
                        <td data-label="Status">{order.status || 'processing'}</td>
                        <td data-label="Created">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td data-label="Actions" className="admin-actions-cell">
                          <button type="button" className="table-action-btn" onClick={() => openOrderView(order)}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination('orders', paginationMeta)}
              </>
            ) : (
              <div className="admin-empty-state">No orders matched your search.</div>
            )}
          </div>
        ) : (
          orderToView ? (
            <div className="admin-detail-grid">
              <div className="admin-detail-card">
                <h3>Order Summary</h3>
                <div className="admin-detail-list">
                  <div><span>Order ID</span><strong>#{shortId(orderToView._id)}</strong></div>
                  <div><span>Status</span><strong>{orderToView.status || 'processing'}</strong></div>
                  <div><span>Shipping</span><strong>{formatMoney(orderToView.shippingCost)}</strong></div>
                  <div><span>Total</span><strong>{formatMoney(orderToView.total)}</strong></div>
                  <div><span>Shipping Service</span><strong>{orderToView.shippingMethod || 'N/A'}</strong></div>
                  <div><span>Created</span><strong>{new Date(orderToView.createdAt).toLocaleString()}</strong></div>
                </div>
              </div>

              <div className="admin-detail-card">
                <h3>Customer</h3>
                <div className="admin-detail-list">
                  <div><span>Email</span><strong>{orderToView.customerEmail || 'Guest Checkout'}</strong></div>
                  <div><span>Phone</span><strong>{orderToView.customerPhone || 'N/A'}</strong></div>
                  <div><span>Payment ID</span><strong>{orderToView.stripePaymentId || 'N/A'}</strong></div>
                </div>
              </div>

              <div className="admin-detail-card">
                <h3>Shipping Address</h3>
                <div className="admin-address-block">
                  <p>{orderToView.shippingAddress?.fullName || 'N/A'}</p>
                  <p>{orderToView.shippingAddress?.addressLine1 || 'N/A'}</p>
                  {orderToView.shippingAddress?.addressLine2 && <p>{orderToView.shippingAddress.addressLine2}</p>}
                  <p>{[orderToView.shippingAddress?.city, orderToView.shippingAddress?.state, orderToView.shippingAddress?.zipCode].filter(Boolean).join(', ') || 'N/A'}</p>
                  <p>{orderToView.shippingAddress?.country || 'N/A'}</p>
                </div>
              </div>

              <div className="admin-detail-card">
                <h3>Items</h3>
                <div className="admin-order-items">
                  {(orderToView.items || []).map((item, index) => (
                    <div key={`${item.productId || item.name}-${index}`} className="admin-order-item">
                      <div className="admin-order-item-main">
                        <strong>{item.name}</strong>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <strong>{formatMoney(Number(item.price) * Number(item.quantity || 1))}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-empty-state">Order details are not available.</div>
          )
        )}
      </section>
    );
  };

  const renderLeadsSection = () => {
    const paginationMeta = getPaginationMeta('leads', filteredLeads);

    const formatDate = (date) => {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const handleStatusChange = async (leadId, newStatus) => {
      try {
        await adminFetch(`/api/leads/${leadId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        });
        setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
        Swal.fire('Success', 'Lead status updated', 'success');
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    };

    const handleDeleteLead = async (leadId) => {
      const result = await Swal.fire({
        title: 'Delete Lead',
        text: 'Are you sure you want to delete this lead?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        try {
          await adminFetch(`/api/leads/${leadId}`, { method: 'DELETE' });
          setLeads(prev => prev.filter(l => l._id !== leadId));
          Swal.fire('Success', 'Lead deleted', 'success');
        } catch (err) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    };

    return (
      <section className="admin-section">
        <div className="admin-table-wrap">
          <div className="admin-filters-row">
            {renderTableSearch('leads', 'Search Lead')}
            <div className="admin-filter-group">
              <select
                value={leadFilters.campaign}
                onChange={(e) => setLeadFilters(prev => ({ ...prev, campaign: e.target.value }))}
                className="admin-filter-select"
              >
                <option value="">All Campaigns</option>
                {leadCampaigns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={leadFilters.status}
                onChange={(e) => setLeadFilters(prev => ({ ...prev, status: e.target.value }))}
                className="admin-filter-select"
              >
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
              <input
                type="date"
                value={leadFilters.startDate}
                onChange={(e) => setLeadFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="admin-filter-date"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={leadFilters.endDate}
                onChange={(e) => setLeadFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="admin-filter-date"
                placeholder="End Date"
              />
              {(leadFilters.campaign || leadFilters.status || leadFilters.startDate || leadFilters.endDate) && (
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => setLeadFilters({ campaign: '', status: '', startDate: '', endDate: '' })}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {paginationMeta.totalEntries ? (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Campaign</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginationMeta.items.map((lead) => (
                    <tr key={lead._id}>
                      <td data-label="Name">{lead.name}</td>
                      <td data-label="Email">{lead.email}</td>
                      <td data-label="Phone">{lead.phone || '-'}</td>
                      <td data-label="Campaign">{lead.utm_campaign || '-'}</td>
                      <td data-label="Source">{lead.source}</td>
                      <td data-label="Status">
                        <span className={`admin-status-badge status-${lead.status}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td data-label="Date">{formatDate(lead.createdAt)}</td>
                      <td data-label="Actions">
                        <div className="admin-table-actions">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                            className="admin-action-select"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="closed">Closed</option>
                          </select>
                          <button
                            type="button"
                            className="admin-action-btn delete"
                            onClick={() => handleDeleteLead(lead._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderPagination('leads', paginationMeta)}
            </>
          ) : (
            <div className="admin-empty-state">No leads found</div>
          )}
        </div>
      </section>
    );
  };

  const renderUsersSection = () => {
    const isList = currentTabView?.mode === 'list';
    const paginationMeta = getPaginationMeta('users', filteredAdminUsers);

    return (
      <section className="admin-section">
        {!isList && (
          <div className="admin-section-header">
            <button type="button" className="admin-secondary-btn" onClick={() => setListView('users')}>
              Back to Table
            </button>
          </div>
        )}
        {isList ? (
          <div className="admin-table-wrap">
            {renderTableSearch(
              'users',
              'Search User',
              <button type="button" className="admin-secondary-btn" onClick={() => openNewView('users')}>
                New User
              </button>
            )}
            {paginationMeta.totalEntries ? (
              <>
                <table className="admin-table">
                  <thead><tr><th>Photo</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
                  <tbody>
                    {paginationMeta.items.map((user) => (
                      <tr key={user._id}>
                        <td data-label="Photo">
                          <span className="admin-table-avatar">
                            {user.profileImage ? (
                              <img src={user.profileImage} alt={user.name} />
                            ) : (
                              getInitials(user.name)
                            )}
                          </span>
                        </td>
                        <td data-label="Name">{user.name}</td>
                        <td data-label="Email">{user.email}</td>
                        <td data-label="Role">{formatRoleLabel(user.role)}</td>
                        <td data-label="Created">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td data-label="Actions" className="admin-actions-cell">
                          <button type="button" className="table-action-btn" onClick={() => openEditView('users', user)}>Edit</button>
                          <button type="button" className="table-action-btn danger" onClick={() => handleDelete('users', user._id, 'Admin user deleted successfully.')}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination('users', paginationMeta)}
              </>
            ) : (
              <div className="admin-empty-state">No users matched your search.</div>
            )}
          </div>
        ) : (
          <form className="admin-form-grid compact" onSubmit={saveAdminUser}>
            <div className="form-group"><label>Name</label><input value={adminUserForm.name} onChange={(e) => setAdminUserForm((prev) => ({ ...prev, name: e.target.value }))} required /></div>
            <div className="form-group"><label>Email</label><input value={adminUserForm.email} onChange={(e) => setAdminUserForm((prev) => ({ ...prev, email: e.target.value }))} required /></div>
            <div className="form-group">
              <label>Profile Image</label>
              <input type="file" accept="image/*" onChange={handleAdminImageUpload} />
              <small className="admin-field-hint">{uploadingField === 'admin' ? 'Uploading image...' : 'Optional. Upload an avatar for this admin user.'}</small>
            </div>
            <div className="form-group">
              <label>Password {adminUserForm._id ? '(leave blank to keep existing)' : ''}</label>
              <div className="admin-password-field">
                <input
                  type={showAdminUserPassword ? 'text' : 'password'}
                  value={adminUserForm.password}
                  onChange={(e) => setAdminUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  required={!adminUserForm._id}
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowAdminUserPassword((prev) => !prev)}
                  aria-label={showAdminUserPassword ? 'Hide password' : 'Show password'}
                >
                  <PasswordToggleIcon visible={showAdminUserPassword} />
                </button>
              </div>
            </div>
            <div className="form-group"><label>Role</label><select value={adminUserForm.role} onChange={(e) => setAdminUserForm((prev) => ({ ...prev, role: e.target.value }))}><option value="admin">Admin</option><option value="staff">Staff</option></select></div>
            {adminUserForm.profileImage && (
              <div className="admin-image-preview-card">
                <span>Admin Preview</span>
                <img src={adminUserForm.profileImage} alt={adminUserForm.name || 'Admin preview'} className="admin-avatar-preview" />
              </div>
            )}
            <div className="admin-form-actions"><button type="submit" className="admin-primary-btn">{adminUserForm._id ? 'Update' : 'Save'}</button></div>
          </form>
        )}
      </section>
    );
  };

  if (authLoading || initialLoading) {
    return <div className="admin-loading">Loading...</div>;
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={logo} alt="HealthFuel" className="admin-brand-logo" />
        </div>

        <div className="admin-tabs">
          {[
            ['dashboard', 'Dashboard'],
            ['products', 'Products'],
            ['customers', 'Customers'],
            ['orders', 'Orders'],
            ['users', 'Users'],
            ['leads', 'Leads']
          ].map(([key, label]) => (
            <NavLink
              key={key}
              to={ADMIN_SECTION_PATHS[key]}
              className={({ isActive }) => `admin-tab${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </aside>

      <main className="admin-content">
        <div className="admin-header">
          <div>
            <h1>{TAB_TITLES[activeTab] || 'Admin Panel'}</h1>
            {activeTab === 'dashboard' && (
              <p>View store performance and totals in one place.</p>
            )}
          </div>
          <div className="admin-header-profile">
            <button
              type="button"
              className="admin-header-meta"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            >
              <span className="admin-header-avatar">
                {adminUser?.profileImage ? (
                  <img src={adminUser.profileImage} alt={adminUser.name} />
                ) : (
                  getInitials(adminUser?.name)
                )}
              </span>
              <span className="admin-header-user-text">
                <span>{adminUser?.name}</span>
                <strong>{formatRoleLabel(adminUser?.role)}</strong>
              </span>
            </button>
            {isProfileMenuOpen && (
              <div className="admin-profile-menu">
                <button type="button" className="admin-profile-menu-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <div className="admin-alert error">{error}</div>}

        {activeTab === 'dashboard' && (
          <section className="admin-section">
            <div className="admin-stats-grid admin-stats-grid-dashboard">
              <div className="admin-stat-card"><span>Products</span><strong>{stats.products}</strong></div>
              <div className="admin-stat-card"><span>Customers</span><strong>{stats.customers}</strong></div>
              <div className="admin-stat-card"><span>Orders</span><strong>{stats.orders}</strong></div>
              <div className="admin-stat-card"><span>Revenue</span><strong>{formatMoney(stats.revenue)}</strong></div>
            </div>
          </section>
        )}

        {activeTab === 'leads' && renderLeadsSection()}
        {activeTab === 'products' && renderProductsSection()}
        {activeTab === 'customers' && renderCustomersSection()}
        {activeTab === 'orders' && renderOrdersSection()}
        {activeTab === 'users' && renderUsersSection()}
      </main>

    </div>
  );
};

export default AdminDashboard;
