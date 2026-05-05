export function createFeed(db) {
  let requests = []
  let listeners = []

  function notify() {
    listeners.forEach(cb => cb([...requests]))
  }

  return {
    async load() {
      requests = await db.fetchOpenRequests()
      notify()
    },

    getRequests() {
      return [...requests]
    },

    handleEvent({ eventType, new: newRow, old: oldRow }) {
      if (eventType === 'INSERT' && newRow.status === 'open') {
        requests = [...requests, newRow]
        notify()
      } else if (eventType === 'UPDATE') {
        if (newRow.status !== 'open') {
          requests = requests.filter(r => r.id !== newRow.id)
        } else if (requests.some(r => r.id === newRow.id)) {
          requests = requests.map(r => r.id === newRow.id ? newRow : r)
        } else {
          requests = [...requests, newRow]
        }
        notify()
      } else if (eventType === 'DELETE') {
        requests = requests.filter(r => r.id !== oldRow.id)
        notify()
      }
    },

    subscribe(callback) {
      listeners.push(callback)
    },
  }
}
