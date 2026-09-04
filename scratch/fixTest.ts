import fs from 'fs';
const file = 'src/domain/portfolio/xirr.test.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('super(...(args as any));', 'super(...(args as []));');
fs.writeFileSync(file, content);
