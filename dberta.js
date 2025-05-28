// MIT License

// Copyright (c) 2025 Stephan Cieszynski

Object.defineProperty(globalThis, 'dberta', {

    value: globalThis?.dberta ?? new class dberta {

        open = (dbName, schema) => new Promise((resolve, reject) => {
            if (!schema) return reject('no schema');

            const request = indexedDB.open(dbName, Object.keys(schema).at(-1));
            request.onerror = () => reject(request.error);
            request.onblocked = () => { reject(request.error); }
            request.onupgradeneeded = (event) => {
                console.debug('onupgradeneeded');

                const db = request.result;

                for (let v = event.oldVersion; v <= event.newVersion; v++) {
                    Object.entries(schema[v]).forEach(([storeName, definition]) => {

                        if (Array.from(db.objectStoreNames).includes(storeName)) {
                            db.deleteObjectStore(storeName)
                        }

                        const [keypath, ...indexes] = definition.split(/\s*(?:,)\s*/);

                        const store = db.createObjectStore(storeName, {
                            // if keyPath.length is 0 return undefined
                            keyPath: keypath.replace(/[\@]/, '') || undefined,
                            autoIncrement: /^[\@]/.test(keypath)
                        });

                        indexes.forEach(indexName => {

                            store.createIndex(
                                indexName.replace(/[\*!]/, ''),
                                indexName
                                    .split(/\+/)
                                    // at this point every keypath is an array
                                    .map(elem => elem.replace(/[\*!]/, ''))
                                    .reduce((prev, cur, idx) => {
                                        switch (idx) {
                                            case 0:
                                                // indexName is keyPath:
                                                return cur;
                                            case 1:
                                                // indexName is compound key
                                                return [prev, cur];
                                            default:
                                                return [...prev, cur];
                                        }
                                    }),
                                {
                                    multiEntry: /^\*/.test(indexName),
                                    unique: /^\!/.test(indexName)
                                });


                            console.debug("index '%s' created", indexName);
                        }); // indexes.forEach
                    }); // Object.entries(schema[v])
                } // for loop
            } // onupgradeneeded

            request.onsuccess = (event) => {
                console.debug('onsuccess');
                const db = event.target.result;

                const begin = (ronly = false, ...storeNames) => {
                    let transaction;

                    return new Promise(async (resolve, reject) => {
                        try {
                            transaction = db.transaction(storeNames, ronly ? 'readonly' : 'readwrite');

                            resolve(storeNames.reduce((obj, storeName) => {
                                const store = transaction.objectStore(storeName);

                                obj[storeName] = {

                                    execute(verb, ...args) {
                                        return new Promise(async (resolve, reject) => {
                                            try {
                                                store[verb](...args).onsuccess = (event) => {
                                                    resolve(event.target.result);
                                                };
                                            } catch (err) {
                                                if (transaction) { transaction.abort(); }
                                                reject(err);
                                            }
                                        });
                                    },

                                    add(obj, key) { return this.execute('add', obj, key); },

                                    count(keyOrKeyRange) { return this.execute('count', keyOrKeyRange); },

                                    delete(keyOrKeyRange) { return this.execute('delete', keyOrKeyRange); },

                                    get(keyOrKeyRange) { return this.execute('get', keyOrKeyRange); },

                                    getKey(keyOrKeyRange) { return this.execute('getKey', keyOrKeyRange); },

                                    getAll(keyRange, limit) { return this.execute('getAll', keyRange, limit); },

                                    getAllKeys(keyRange, limit) { return this.execute('getAllKeys', keyRange, limit); },

                                    put(obj, key) { return execute('put', obj, key); },
                                }

                                return obj;
                            }, {}));
                        } catch (err) {
                            if (transaction) { transaction.abort(); }
                            reject(err);
                        }
                    });
                }

                resolve({
                    write(...args) { return begin(false, ...args); },
                    read(...args) { return begin(true, ...args); },
                    close() { db.close(); },
                });
            } // request.onsuccess
        }); // open

        // functions to build keyranges
        eq = (z) => IDBKeyRange.only(z);
        le = (y) => IDBKeyRange.upperBound(y);
        lt = (y) => IDBKeyRange.upperBound(y, true);
        ge = (x) => IDBKeyRange.lowerBound(x);
        gt = (x) => IDBKeyRange.lowerBound(x, true);
        between = (x, y, bx, by) => IDBKeyRange.bound(x, y, bx, by);
        startsWith = (s) => IDBKeyRange.bound(s, s + '\uffff', true, true);
    }
}); // Object.defineProperty