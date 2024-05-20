import RedisParser from "./parser";
import CliCommands from "./commands";
import ResponseConstants from "./contants";
import * as net from "node:net";


const hashMap = new Map();
const redisPort = parseInt(process.argv[3]) || 6379;
const role = process.argv[4] == "--replicaof" ? "slave" : "master";

const masterReplId = "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
const masterOffset = 0;

const masterInfo = process.argv[5] && process.argv[5].length>0 ? process.argv[5].trim().split(' ') : ""


if(masterInfo && masterInfo.length) {
    console.warn("GOING IN CLIENT SOCKET!!")
    const slaveSocketClient = net.createConnection({host: masterInfo[0] as string, port: parseInt(masterInfo[1])});
    slaveSocketClient.on("connect", async() => {
        slaveSocketClient.write(RedisParser.convertToBulkStringArray(['PING']));    
    });

    let step = 1
    slaveSocketClient.on('data', (data)=>{
        console.log("got data from master - ", data.toString())
        switch(step) {
            case 1:
                slaveSocketClient.write(RedisParser.convertToBulkStringArray(['REPLCONF', 'listening-port', redisPort.toString()]));
                step++;
                break;
            case 2:
                slaveSocketClient.write(RedisParser.convertToBulkStringArray(['REPLCONF', 'capa', 'psync2']));
                step++;
                break;
        }
    })
}

const server: net.Server = net.createServer((connection: net.Socket) => {

  /* Handle connection */

  connection.on("data", (data) => {

    const cmd = RedisParser.parseInput(data.toString());
    console.log("cmd: " + cmd);

    switch (cmd[0].toUpperCase()) {
        case CliCommands.PING:
            connection.write(RedisParser.convertToSimpleString(ResponseConstants.PONG));
        break;
        case CliCommands.ECHO:
            connection.write(RedisParser.convertToBulkString(cmd[1]))
        break;
        case CliCommands.GET:
            connection.write(RedisParser.convertToBulkString(hashMap.get(cmd[1])));
            break;
        case CliCommands.SET:
            hashMap.set(cmd[1], cmd[2]);
            connection.write(RedisParser.convertToSimpleString(ResponseConstants.OK));
            if (cmd[3] && cmd[3].toUpperCase() == "PX") {
                setTimeout(() => {
                hashMap.delete(cmd[1]);
                }, parseInt(cmd[4]));
            }
        break;
        case CliCommands.INFO: 
            connection.write(RedisParser.convertToBulkString(`role:${role}\r\nmaster_replid:${masterReplId}\r\nmaster_repl_offset:${masterOffset}`));
            break;
        case CliCommands.REPLCONF:
            connection.write(RedisParser.convertToSimpleString(ResponseConstants.OK));
            break;
    }
  });

});

server.listen(redisPort, "127.0.0.1");