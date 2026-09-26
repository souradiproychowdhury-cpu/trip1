import app from '../wandor_temp/server';

export default function handler(req: any, res: any) {
  return app(req, res);
}
