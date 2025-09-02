import { createSchema } from './packages/db/index';

async function setup() {
    try {
        console.log('Creating database schema...');
        await createSchema();
        console.log('Schema created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating schema:', error);
        process.exit(1);
    }
}

setup();