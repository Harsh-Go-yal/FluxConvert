const { PDFDocument } = require('pdf-lib');
console.log('Resolved pdf-lib:', require.resolve('pdf-lib'));

async function test() {
    try {
        const doc = await PDFDocument.create();
        console.log('PDFDocument created');
        if (typeof doc.encrypt === 'function') {
            console.log('encrypt method exists');
        } else {
            console.error('encrypt method MISSING');
            console.log('Available methods:', Object.keys(doc));
            console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(doc)));
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
