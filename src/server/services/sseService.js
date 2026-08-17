// A minimal Server-Sent Events hub. Connected browser tabs on the Live
// Updates page subscribe here and receive a push the moment the admin
// publishes, edits, unpublishes, or deletes an update — no polling needed.

const clients = new Set();

function addClient(res) {
  clients.add(res);
}

function removeClient(res) {
  clients.delete(res);
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

function clientCount() {
  return clients.size;
}

module.exports = { addClient, removeClient, broadcast, clientCount };
