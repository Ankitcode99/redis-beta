import * as net from "net";
import RedisParser from "./parser";
import CliCommands from "./commands";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {

    connection.on('data', (data: string) =>{

        const commands = RedisParser.parseInput(data.toString())
        // Process each command
        console.log("Commands: " + commands)

        for(let idx=0;idx<commands.length;) {
            if(commands[idx] == CliCommands.PING) {
                connection.write(RedisParser.convertOutputToRESP("PONG", CliCommands.PING))
                idx += 1;
            } else if(commands[idx] == CliCommands.ECHO) {
                // console.log("echo o/p-", commands[idx+1])
                connection.write(RedisParser.convertOutputToRESP(commands[idx+1], CliCommands.ECHO));
                idx += 2;   
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