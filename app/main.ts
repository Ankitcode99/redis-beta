import RedisParser from "./parser";
import CliCommands from "./commands";
import ResponseConstants from "./contants";
import * as net from "node:net";

// You can use print statements as follows for debugging, they'll be visible when running tests.

console.log("Logs from your program will appear here!");

const hashMap = new Map();
const redisPort = parseInt(process.argv[3]) || 6379;
console.log(process.argv[3])
// Uncomment this block to pass the first stage

const server: net.Server = net.createServer((connection: net.Socket) => {

  /* Handle connection */

  connection.on("data", (data) => {

    const cmd = RedisParser.parseInput(data.toString());
    console.log("cmd: " + cmd);
    const upperCase = cmd[0].toUpperCase();

    console.log("upercaseVariable", upperCase);

    switch (upperCase) {
      case "PING":
        connection.write(RedisParser.convertOutputToRESP(ResponseConstants.PONG, CliCommands.PING));
        break;
      case "ECHO":
        connection.write(RedisParser.convertOutputToRESP(cmd[1], CliCommands.ECHO));
        break;
      case "GET":
          connection.write(RedisParser.convertOutputToRESP(hashMap.get(cmd[1]), CliCommands.GET));
          break;
      case "SET":
        hashMap.set(cmd[1], cmd[2]);
        connection.write(RedisParser.convertOutputToRESP(ResponseConstants.OK, CliCommands.SET));
        if (cmd[3] && cmd[3].toUpperCase() == "PX") {
          setTimeout(() => {
            hashMap.delete(cmd[1]);
          }, parseInt(cmd[4]));
        }
        break;
    }
  });

});

server.listen(redisPort, "127.0.0.1");