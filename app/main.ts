import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {

    connection.on('data', (data: string) =>{

        const commands = data.toString().trim().split('\n');
        // Process each command

        commands.forEach(command => {

            if (command.trim() === "PING") {

                connection.write('+PONG\r\n');

            }

        });
    })

    // connection.on('end', () => {
    //     console.log('Connection closed');
    // });
    
      // Handle errors
    connection.on('error', (err) => {
        console.error('Error:', err);
    });

});

server.listen(6379, "127.0.0.1");