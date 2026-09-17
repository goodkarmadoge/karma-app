"""Serve Karma locally with byte-range support for synchronized HTML5 audio."""
import argparse, functools, os, re
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class KarmaHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.remaining=None
        path=self.translate_path(self.path)
        if os.path.isdir(path):return super().send_head()
        try:stream=open(path,'rb')
        except OSError:
            self.send_error(404,'File not found');return None
        size=os.fstat(stream.fileno()).st_size
        start,end=0,size-1
        requested=self.headers.get('Range')
        if requested:
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',requested.strip())
            valid=bool(match and (match[1] or match[2]))
            if valid:
                if match[1]:
                    start=int(match[1]);end=min(int(match[2]) if match[2] else end,end)
                else:start=max(0,size-int(match[2]))
                valid=0<=start<=end<size
            if not valid:
                stream.close();self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return None
            self.send_response(206);self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        else:self.send_response(200)
        self.send_header('Content-Type',self.guess_type(path))
        self.send_header('Content-Length',str(end-start+1))
        self.send_header('Accept-Ranges','bytes')
        self.send_header('Cache-Control','no-cache')
        self.end_headers();stream.seek(start);self.remaining=end-start+1
        return stream

    def copyfile(self,source,output):
        if self.remaining is None:return super().copyfile(source,output)
        try:
            while self.remaining>0:
                chunk=source.read(min(65536,self.remaining))
                if not chunk:break
                output.write(chunk);self.remaining-=len(chunk)
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=4173);args=parser.parse_args()
    directory=Path(__file__).resolve().parent/'dist'
    handler=functools.partial(KarmaHandler,directory=str(directory))
    server=ThreadingHTTPServer(('127.0.0.1',args.port),handler)
    print(f'Karma preview: http://127.0.0.1:{args.port}/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
