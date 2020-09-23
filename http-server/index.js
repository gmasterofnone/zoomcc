import express from "express";
import bodyParser from "body-parser";
import routes from './routes'


const port = process.env.port || 3000;
const httpServer = express();

httpServer.use(express.static("dist/clientBuild"));
httpServer.use(bodyParser.json());
httpServer.use('/', routes);

httpServer.listen(port, () =>
  console.info(`Application running at http://localhost:${port}`)
);

export default httpServer;
