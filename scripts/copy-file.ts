import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

const fileRelPath: string = args[0];
const copyToRelPath: string = args[1];

if (fileRelPath == null) {
    throw Error('Missing filePath parameter');
}

if (copyToRelPath == null) {
    throw Error('Missing copyToPath parameter');
}

const rootDirectory = path.resolve(__dirname, '..');
const filePath = path.join(rootDirectory, fileRelPath);
const copyToPath = path.join(rootDirectory, copyToRelPath);

const newDirPath = copyToPath.split('\\').slice(0, -1).join('\\');

fs.mkdirSync(newDirPath, { recursive: true });

fs.writeFile(copyToPath, fs.readFileSync(filePath), (err) => {
    if (err) {
        console.log(err);
        throw err;
    }
    console.log(`File: ${filePath} correctly copied to: ${copyToPath}`);
});
