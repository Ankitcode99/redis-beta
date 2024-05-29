import RedisParser from "./parser";
import CliCommands from "./commands";
import ResponseConstants, { rdbData } from "./contants";
import * as net from "node:net";
import { RedisInstance } from "./cache";


const hashMap = new Map();
const redisPort = parseInt(process.argv[3]) || 6379;
const role = process.argv[4] == "--replicaof" ? "slave" : "master";

const masterReplId = "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
const masterOffset = 0;

const masterInfo = process.argv[5] && process.argv[5].length>0 ? process.argv[5].trim().split(' ') : ""


// if(masterInfo && masterInfo.length) {
//     console.warn("GOING IN CLIENT SOCKET!!")
//     const slaveSocketClient = net.createConnection({host: masterInfo[0] as string, port: parseInt(masterInfo[1])});
//     slaveSocketClient.on("connect", async() => {
//         slaveSocketClient.write(RedisParser.convertToBulkStringArray(['PING']));    
//     });

//     let step = 1
//     slaveSocketClient.on('data', (data)=>{
//         console.log("got data from master - ", data.toString())

//         // if(step > 4) {
//         //     handleReplication()
//         // }

//         switch(step) {
//             case 1:
//                 slaveSocketClient.write(RedisParser.convertToBulkStringArray(['REPLCONF', 'listening-port', redisPort.toString()]));
//                 step++;
//                 break;
//             case 2:
//                 slaveSocketClient.write(RedisParser.convertToBulkStringArray(['REPLCONF', 'capa', 'psync2']));
//                 step++;
//                 break;
//             case 3: 
//                 slaveSocketClient.write(RedisParser.convertToBulkStringArray(['PSYNC', '?', '-1']))
//                 step++;
//                 break;
//             case 4:
//                 console.log("Got RDB file! Handshake completed!")
//                 break;
//         }
//     })
// }
let instance:RedisInstance;
if(masterInfo && masterInfo.length) {
    instance = RedisInstance.initReplica(masterInfo[0] ,masterInfo[1])
    instance.performHandshakeWithMaster(redisPort)
} else {
    instance = RedisInstance.initMaster();
}

const server: net.Server = net.createServer((connection: net.Socket) => {
  /* Handle connection */

  connection.on("data", (data) => {
    console.log("At", role)
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
            connection.write(RedisParser.convertToBulkString(instance.storage.get(cmd[1])));
            break;
        case CliCommands.SET:
            instance.storage.set(cmd[1], cmd[2]);
            
            connection.write(RedisParser.convertToSimpleString(ResponseConstants.OK));
            instance.propagateCommandToSlaves(data.toString());
                

            if (cmd[3] && cmd[3].toUpperCase() == "PX") {
                setTimeout(() => {
                    console.log("Deleting key ",cmd[1],"from master!")
                    instance.storage.delete(cmd[1]);
                }, parseInt(cmd[4]));
            }
        break;
        case CliCommands.INFO: 
            connection.write(RedisParser.convertToBulkString(`role:${role}\r\nmaster_replid:${masterReplId}\r\nmaster_repl_offset:${masterOffset}`));
            break;
        case CliCommands.REPLCONF:
            connection.write(RedisParser.convertToSimpleString(ResponseConstants.OK));
            break;
        case CliCommands.PSYNC:
            instance.addSlaves(connection)
            connection.write(RedisParser.convertToSimpleString(`FULLRESYNC ${masterReplId} 0`));
            setTimeout(()=>{
                connection.write(serialize())

            },1)
            break;
        case CliCommands.WAIT:
            connection.write(RedisParser.convertToSimpleInteger(0));
            break;
            
    }
  });

});

const serialize = () => {

    const content = Buffer.from(rdbData, "hex");

    return Buffer.concat([Buffer.from(`$${content.length}\r\n`), content]);

}

server.listen(redisPort, "127.0.0.1", ()=> {
    console.log(`\n\n${role.toUpperCase()} is ready and listening on localhost ${redisPort}`)
});