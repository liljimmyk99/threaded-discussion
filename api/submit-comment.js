import { connection } from "./dbConnection.js";
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  const reqBody = req.body;
  res.setHeader('Cache-Control', 'max-age=0, s-maxage=300');
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");
  const commentUUID = uuidv4();
  reqBody.uid = commentUUID;
  reqBody.submitted_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await connection.query('INSERT INTO comments (uid, thread_uid, submitted_time, body, is_reply, reply_to ) VALUES (?,?,?,?)', [reqBody.uid, reqBody.thread_uid, reqBody.submitted_time, reqBody.body, reqBody.is_reply, reqbody.reply_to]);
  res.json(reqBody);
  await connection.end();
}