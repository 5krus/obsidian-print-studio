import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':['build/index.html','text/html'],'/demo.js':['build/demo.js','text/javascript'],'/styles.css':['build/styles.css','text/css'],'/theme.css':['build/theme.css','text/css']};
createServer(async(req,res)=>{const item=files[new URL(req.url,'http://localhost').pathname];if(!item){res.writeHead(404);res.end();return;}try{res.setHeader('Content-Type',item[1]);res.end(await readFile(item[0]));}catch{res.writeHead(500);res.end('Build the demo first.');}}).listen(5184,'127.0.0.1',()=>console.log('Print Studio preview: http://localhost:5184'));
