import CliCommands from "./commands";

export default class RedisParser {

    public static parseInput(input: string): string[] {
        const inp = input.trim().split("\r\n");
        console.log(inp);
        let arr:string[] = [];
        // let arrSize = -1;

        for (let idx = 0; idx < inp.length; ) {
            const wildCard = inp[idx].charAt(0);

            switch (wildCard) {
                case "*":
                    // arrSize = parseInt(inp[0].substring(1));
                    idx++;
                break;
                case "$":
                    const len = parseInt(inp[idx].substring(1));
                    const command = inp[idx + 1].substring(0, 0 + len);
                    arr.push(command);
                    idx += 2;
            }
        }
        return arr;
    }

    public static convertOutputToRESP(output: string|undefined, command: string): string {
        switch (command) {
            case CliCommands.PING:
            case CliCommands.SET:
                return `+${output}\r\n`;
            case CliCommands.ECHO:
            case CliCommands.GET:
            case CliCommands.INFO:
                if(!output) {
                    return "$-1\r\n"
                }
                return `\$${output.length}\r\n${output}\r\n`;
            default:
                return ""
        }
        
    }
}