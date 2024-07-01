type TCollections = "workflowSteps" | "workflowStepConnections";

interface Query {
    [key: string]: any;
}

class InMemoryStorage {
    private static instance: InMemoryStorage;
    private data: { [key: string]: any[] } = {};

    private constructor() { }

    public static getInstance(): InMemoryStorage {
        if (!InMemoryStorage.instance) {
            InMemoryStorage.instance = new InMemoryStorage();
            Object.freeze(InMemoryStorage.instance);
        }
        return InMemoryStorage.instance;
    }

    public create<T>(collection: TCollections, item: T): T {
        if (!this.data[collection]) {
            this.data[collection] = [];
        }
        this.data[collection].push(item);
        return item;
    }

    public find<T>(collection: TCollections, query: Query): T[] {
        return this.data[collection]?.filter(item =>
            Object.keys(query).every(key => item[key] === query[key])
        ) || [];
    }

    public findOne<T>(collection: TCollections, query: Query): T | null {
        return this.data[collection]?.find(item =>
            Object.keys(query).every(key => item[key] === query[key])
        ) || null;
    }

    public update<T>(collection: TCollections, query: Query, updates: Partial<T>): T[] {
        const items = this.find<T>(collection, query);
        items.forEach((item: any) => {
            Object.assign(item, updates);
        });
        return items;
    }

    public upsert<T>(collection: TCollections, upsertItem: Query): T {
        const item = this.findOne<T>(collection, upsertItem);

        if (item) {
            Object.assign(item, item);
            return item;
        }

        return this.create(collection, upsertItem as T);
    }

    public delete<T>(collection: TCollections, query: Query): T[] {
        const items = this.find<T>(collection, query);
        this.data[collection] = this.data[collection].filter(item => !items.includes(item));
        return items;
    }

    public clear(collection?: TCollections): void {
        if (collection) {
            this.data[collection] = [];
            return;
        }
        this.data = {};
    }
}

export const inMemoryStorage = InMemoryStorage.getInstance();
