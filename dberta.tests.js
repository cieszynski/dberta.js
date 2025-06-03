

const test_open_without_scheme = async () => {
    try {
        const berta = await dberta.open('berta-test1');
    } catch ({ name, message }) {
        console.info('test_open_without_scheme: ', (name === 'NotFoundError'));
    } finally {
        console.info('test_open_without_scheme: done.');
    }
}

const test_open_with_forbidden_storename = async () => {
    let berta;
    try {
        berta = await dberta.open('berta-test2', {
            1: {
                transaction: "@id"
            }
        });
    } catch ({ name, message }) {
        console.info('test_open_with_forbidden_storename: ', (name === 'NotAllowedError'));
    } finally {
        indexedDB.open('berta-test2').onsuccess = (event) => {
            event.target.result.close();
            indexedDB.deleteDatabase('berta-test2');
            console.info('test_open_with_forbidden_storename: done.');
        }
    }
}

const test_open_create_stores = async () => {
    try {
        const berta = await dberta.open('berta-test3', {
            1: {
                a: "@id, i1",
                b: "@, i1, *i2",
                c: "id, i1, !i2, i1+i2",
                d: ", i1"
            }
        });

        berta.close();

        indexedDB.open('berta-test3').onsuccess = (event) => {
            const db = event.target.result;
            Array.from(db.objectStoreNames).forEach(storeName => {
                console.assert(['a', 'b', 'c', 'd'].includes(storeName), `store ${storeName} not created`);
                const store = db.transaction(storeName).objectStore(storeName)

                switch (store.name) {
                    case 'a':
                        console.assert(store.autoIncrement === true);
                        console.assert(store.keyPath === 'id');
                        console.assert(store.indexNames.contains('i1'));
                        break;
                    case 'b':
                        console.assert(store.autoIncrement === true);
                        console.assert(store.keyPath === null);
                        console.assert(store.indexNames.contains('i1'));
                        console.assert(store.indexNames.contains('i2'));
                        console.assert(store.index('i2').multiEntry === true);
                        break;
                    case 'c':
                        console.assert(store.autoIncrement === false);
                        console.assert(store.keyPath === 'id');
                        console.assert(store.indexNames.contains('i1'));
                        console.assert(store.indexNames.contains('i2'));
                        console.assert(store.index('i2').unique === true);
                        console.assert(store.indexNames.contains('i1+i2'));
                        console.assert(Array.isArray(store.index('i1+i2').keyPath));
                        break;
                    case 'd':
                        console.assert(store.autoIncrement === false);
                        console.assert(store.keyPath === null);
                        console.assert(store.indexNames.contains('i1'));
                        break;
                }
            });

            db.close();

            indexedDB.deleteDatabase(db.name);

            console.info('test_open_create_stores: ', true)
        }
    } catch ({ name, message }) {
        console.error(name, message);
    } finally {
        console.info('test_open_create_stores: done.')
    }
}

const test_open_multiple_versions = async () => {
    try {
        const berta = await dberta.open('berta-test4', {
            3: {
                user: "@id3, firstname, lastname",
                events: "@id, date, title"
            },
            2: {
                user: "@id2, firstname, age, firstname+age"
            },
            1: {
                user: "@id1, firstname, age, firstname+age"
            }
        });

        berta.close();

        indexedDB.open('berta-test4').onsuccess = (event) => {

            const db = event.target.result;

            Array.from(db.objectStoreNames).forEach((storeName) => {
                const store = db.transaction(storeName).objectStore(storeName)

                switch (store.name) {
                    case 'user':
                        console.assert(store.keyPath === 'id3');
                        console.assert(store.indexNames.contains('firstname'));
                        console.assert(store.indexNames.contains('lastname'));
                        break;
                    case 'events':
                        console.assert(store.keyPath === 'id');
                        console.assert(store.indexNames.contains('date'));
                        console.assert(store.indexNames.contains('title'));
                        break;
                    default:
                        console.error('unknown store: ', store.name);
                }
            });

            db.close();

            indexedDB.deleteDatabase(db.name);
        }
    } catch ({ name, message }) {
        console.error(name, message);
    } finally {
        console.info('test_open_multiple_versions: done.')
    }
}