/**
 * Strips the grey/white checkerboard background from lifter.png by making
 * any low-chroma (achromatic) pixel transparent, then saves an RGBA PNG.
 * Uses only Node.js built-ins — no npm packages needed.
 */
import fs from 'fs';
import zlib from 'zlib';

const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) { c ^= b; for (let i=0;i<8;i++) c = c&1 ? (c>>>1)^0xEDB88320 : c>>>1; }
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function writeChunk(type, data) {
  const len=Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t=Buffer.from(type,'ascii');
  const crcBuf=Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t,data])));
  return Buffer.concat([len,t,data,crcBuf]);
}
function readChunks(buf) {
  const chunks=[]; let p=8;
  while(p<buf.length) {
    const len=buf.readUInt32BE(p);
    chunks.push({ type:buf.slice(p+4,p+8).toString('ascii'), data:buf.slice(p+8,p+8+len) });
    p+=12+len;
  }
  return chunks;
}

// Paeth predictor
function paeth(a,b,c) {
  const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c);
  return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
}

const raw = fs.readFileSync('public/lifter.png');
const chunks = readChunks(raw);

// Parse IHDR
const ihdr = chunks.find(c=>c.type==='IHDR').data;
const W = ihdr.readUInt32BE(0), H = ihdr.readUInt32BE(4);
const depth = ihdr[8], colorType = ihdr[9];
// colorType 2 = RGB (3 bytes), 6 = RGBA (4 bytes)
const srcBpp = colorType===6?4:3;
console.log(`Input: ${W}x${H} depth=${depth} colorType=${colorType} (${srcBpp}bpp)`);

// Decompress IDAT
const compressed = Buffer.concat(chunks.filter(c=>c.type==='IDAT').map(c=>c.data));
const inflated = zlib.inflateSync(compressed);

// Reconstruct pixels by undoing PNG filters
const stride = W*srcBpp;
const pixels = Buffer.alloc(H*stride);
for (let y=0;y<H;y++) {
  const flt = inflated[y*(stride+1)];
  const row = inflated.slice(y*(stride+1)+1, y*(stride+1)+1+stride);
  const prev = y>0 ? pixels.slice((y-1)*stride,y*stride) : Buffer.alloc(stride);
  const cur  = pixels.slice(y*stride,(y+1)*stride);
  for (let x=0;x<stride;x++) {
    const a = x>=srcBpp ? cur[x-srcBpp] : 0;
    const b = prev[x];
    const c = x>=srcBpp ? prev[x-srcBpp] : 0;
    switch(flt) {
      case 0: cur[x]=row[x]; break;
      case 1: cur[x]=(row[x]+a)&0xFF; break;
      case 2: cur[x]=(row[x]+b)&0xFF; break;
      case 3: cur[x]=(row[x]+Math.floor((a+b)/2))&0xFF; break;
      case 4: cur[x]=(row[x]+paeth(a,b,c))&0xFF; break;
      default: throw new Error(`Unknown filter ${flt} at row ${y}`);
    }
  }
}

// Build RGBA output: make achromatic (grey/white) pixels transparent
// Gold pixels have chroma ~124; checkerboard grey/white has chroma ~0
const CHROMA_THRESHOLD = 40;
const out = Buffer.alloc(H*W*4);
let made=0;
for (let i=0;i<W*H;i++) {
  const s=i*srcBpp, d=i*4;
  const r=pixels[s], g=pixels[s+1], b=pixels[s+2];
  const a=srcBpp===4?pixels[s+3]:255;
  const chroma = Math.max(r,g,b)-Math.min(r,g,b);
  if (chroma < CHROMA_THRESHOLD || a < 20) {
    out[d]=r; out[d+1]=g; out[d+2]=b; out[d+3]=0; made++;
  } else {
    out[d]=r; out[d+1]=g; out[d+2]=b; out[d+3]=255;
  }
}
console.log(`Made ${made} of ${W*H} pixels transparent (${(made/W/H*100).toFixed(1)}%)`);

// Write new PNG with None (0) filter per row
const newRaw=Buffer.alloc(H*(W*4+1));
for(let y=0;y<H;y++){
  newRaw[y*(W*4+1)]=0;
  out.copy(newRaw,y*(W*4+1)+1,y*W*4,(y+1)*W*4);
}
const deflated = zlib.deflateSync(newRaw,{level:9});

const newIhdr=Buffer.alloc(13);
newIhdr.writeUInt32BE(W,0); newIhdr.writeUInt32BE(H,4);
newIhdr[8]=8; newIhdr[9]=6; // RGBA

const result=Buffer.concat([PNG_SIG,writeChunk('IHDR',newIhdr),writeChunk('IDAT',deflated),writeChunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync('public/lifter.png',result);
fs.copyFileSync('public/lifter.png','src/assets/lifter.png');
console.log(`Saved: ${result.length} bytes → public/lifter.png + src/assets/lifter.png`);
