import * as net from "net";
import { randomUUID } from "node:crypto";
import RedisParser from "./parser";
import CliCommands from "./commands";
enum InstanceRole {
    MASTER = "master",
    REPLICA = "slave", 
}

export class RedisInstance {
    private readonly slaves: net.Socket[] = [];
    public storage:Map<string, any> = new Map();
    
    constructor(
        readonly role: InstanceRole,
        readonly replId: string, //  replication Id
        readonly replicationOffset: number,
        public readonly masterConfig?: Record<string, any>
    ) {}

    static initMaster() {
        const id = randomUUID().replace(/-/g, "");
        return new RedisInstance(InstanceRole.MASTER, id, 0);
    }
    
    static initReplica(masterHost: string, masterPort: string) {
        const id = randomUUID().replace(/-/g, "");
        console.log(    
          `Initialized replica with connection to master ${masterHost}:${masterPort}`
        );
    
        return new RedisInstance(InstanceRole.REPLICA, id, 0, {
          masterPort,
          masterHost,
        });
    }

    addSlaves(connString: net.Socket) {
        // console.log("Adding slave with socket")
        this.slaves.push(connString);
    }

    propagateCommandToSlaves(cmd: string) {
        console.log("Propagating - ",cmd,"   to slaves!")
        for (const conn of this.slaves) {
          conn.write(cmd, err => {
            if (err) 
                console.warn(err);
          });
        }
    }

    IsMaster() {
        return this.role == InstanceRole.MASTER;
    }
    
    
    replicationInfo() {
        return `# Replication\nrole:${this.role}\nmaster_replid:${this.replId}\nmaster_repl_offset:${this.replicationOffset}`;
    }
    
    getMasterAddress() {
        if (!this.masterConfig) 
            return null;
    
        const host = this.masterConfig["masterHost"];
        const port = this.masterConfig["masterPort"];
        return `${host}:${port}`;
    }


    performHandshakeWithMaster(port: number) {

        if (!this.masterConfig) {
          throw Error("Can't start replica without master config");
        }
    
        /**
         * Steps to perform handshake:
         * 1. Create a socket connection with the master
         * 2. Start handshake loop:
         *   a. Send a PING command to the master - receive PONG
         *   b. Send `REPLCONF listening-port <PORT>` to the master - receive OK
         *   c. Send `REPLCONF capa psync2` to the master - receive OK
         *   d. Send `PSYNC ? -1` to the master - receive FULLRESYNC & empty RDB file.
         *   
         */
        const client = net.createConnection(
            {
            host: this.masterConfig["masterHost"],
            port: this.masterConfig["masterPort"],
            }, () => {
            console.log(
                `Connected to master, initiating handshake -> ${this.masterConfig}`
            );
            client.write(RedisParser.convertToBulkStringArray(["PING"]));
            }
        );
    
        client.on("error", error => {
          console.log(`Error: ${error.message}`);
        });
    
        client.on("close", () => {
          console.log("Connection closed");
        });
    
        handshakeLoop(client, port, this);
    }
}

function handshakeLoop(socket: net.Socket, port: number, slaveInstance: RedisInstance) {
    let step = 1;
    let isComplete = false;
  
    socket.on("data", (data: Buffer) => {
  
        console.log(`Handshake ${step}/5`, { data: data.toString() });
        if (isComplete) {
            const res = handleReplicationCommands(data.toString(), slaveInstance);
            if (res) {
                socket.write(res);
            }
            return;
        }
  

        switch (step) {
  
            case 1:
                socket.write(RedisParser.convertToBulkStringArray(['REPLCONF', 'listening-port', port.toString()]));
                break;

            case 2:
                socket.write(RedisParser.convertToBulkStringArray(['REPLCONF', 'capa', 'psync2']));
                break;

            case 3:
                socket.write(RedisParser.convertToBulkStringArray(['PSYNC', '?', '-1']));
                break;

            case 4:
                console.log("[slave]Got FULLRESYNC ");
                break;
            case 5:
                console.log("[slave] Got RDB File. HANDSHAKE COMPLETED for slave "+slaveInstance.replId);
                isComplete = true
        }
  
        step++;
  
    });
  
}

function handleReplicationCommands(command: string, slaveInstance: RedisInstance) {
    const cmd = RedisParser.parseInput(command);

    console.log("handleReplicationCommands - ",cmd);
    // switch(cmd[0]) {
    //     case CliCommands.SET:
    //         slaveInstance.storage.set(cmd[1],cmd[2]);
            
    // }    
    for(let i=0;i<cmd.length;) {
        if(cmd[i]=="SET") {
            slaveInstance.storage.set(cmd[i+1],cmd[i+2]);
            if(cmd[i+3] && cmd[i+3]=='px' && cmd[i+4]){
                setTimeout(()=>{
                    console.log("Deleting key ",cmd[i+1],"from slave ",slaveInstance.replId)
                    slaveInstance.storage.delete(cmd[i+1]);
                }, parseInt(cmd[4]))

                i = i+5;
            }else{
                i=i+3;
            }
        } else if(cmd[i] == 'REPLCONF') {
            return RedisParser.convertToBulkStringArray(['REPLCONF', 'ACK', '0'])
        }
    }

    return null
}
