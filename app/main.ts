import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {

    connection.on('data', (data: string) =>{

        const input: string[] = data.toString().trim().split('\n');
        for(let i = 0; i < input.length; i++) {
            connection.write("+PONG\r\n")
        }
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