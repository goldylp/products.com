const mongoose = require('mongoose');

const renameCollectionIfNeeded = async (fromName, toName) => {
  const db = mongoose.connection.db;
  if (!db) {
    return;
  }

  const [fromCollection, toCollection] = await Promise.all([
    db.listCollections({ name: fromName }, { nameOnly: true }).toArray(),
    db.listCollections({ name: toName }, { nameOnly: true }).toArray()
  ]);

  if (!fromCollection.length || toCollection.length) {
    return;
  }

  await db.collection(fromName).rename(toName);
  console.log(`Renamed MongoDB collection ${fromName} -> ${toName}`);
};

const migrateCollections = async () => {
  await renameCollectionIfNeeded('adminusers', 'admin_users');
  await renameCollectionIfNeeded('contactmessages', 'contact_messages');
};

module.exports = {
  migrateCollections
};
