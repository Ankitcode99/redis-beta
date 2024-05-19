import * as net from "net";
import RedisParser from "./parser";
import CliCommands from "./commands";
import ResponseConstants from "./contants";
import { MyCache } from "./cache";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");
let key=""
const cacheObj = new MyCache();
// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {

    connection.on('data', (data: string) =>{

        const commands = RedisParser.parseInput(data.toString())
        // Process each command
        console.log("Commands: " + commands)
        for(let idx=0;idx<commands.length;) {
            // console.log("idx - ", idx)
            switch (commands[idx]) {
                case CliCommands.PING:
                    connection.write(RedisParser.convertOutputToRESP(ResponseConstants.PONG, CliCommands.PING));
                    idx += 1;
                    break;
                case CliCommands.ECHO:
                    connection.write(RedisParser.convertOutputToRESP(commands[idx + 1], CliCommands.ECHO));
                    idx += 2;
                    break;
                case CliCommands.SET:
                    key = commands[idx+1];
                    const value = commands[idx+2];
                    cacheObj.set(key, value);
                    connection.write(RedisParser.convertOutputToRESP(ResponseConstants.OK, CliCommands.SET));
                    idx += 3;
                    break;
                
                case CliCommands.GET: 
                    key = commands[idx+1];
                    connection.write(RedisParser.convertOutputToRESP(cacheObj.get(key), CliCommands.GET));
                    idx += 2;
                    break;
                
            }
            
        }
    })

    connection.on('end', () => {
        console.log('Connection closed');
    });
    
      // Handle errors
    connection.on('error', (err) => {
        console.error('Error:', err);
    });

});

server.listen(6379, "127.0.0.1");