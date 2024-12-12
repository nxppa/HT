const Bil = 10 ** 9
const { Connection, PublicKey, clusterApiUrl, Keypair, VersionedTransaction, Message, Transaction } = require('@solana/web3.js');
const SOLANA_RPC_ENDPOINT = "https://public.ligmanode.com" //TODO MAYBE make it use multiple endpoints 
const connection = new Connection(SOLANA_RPC_ENDPOINT, {
    commitment: 'confirmed',
});

function unixToRegularTime(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleString();
}
const ProgramMapping = {
    "11111111111111111111111111111111": "System Program",
    ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "Associated Token Account Program",
    TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token Program"
}
async function ParseSignature(Signature) {
    const Interaction = await connection.getParsedTransaction(Signature, { "maxSupportedTransactionVersion": 0 })
    if (!Interaction){
        return null
    }
    const jsonString = JSON.stringify(Interaction, null, 2)
    //console.log(jsonString)
    //4tSp9X87ffp225ycesAfx3RiNJd2dnVGjPZsa51XTQsfFEqwvhJPThEqSgi9aifu44Uh74dqeBnsTZk17vYG2Miv
    const Time = unixToRegularTime(Interaction.blockTime) //TODO make it so that it localised to telegram users location
    const message = Interaction.transaction.message
    const Instructions = message.instructions
    let index = -1
    AddedInstructionsLookUp = {}
    for (const InstructionMatrices of Interaction.meta.innerInstructions) {
        const Index = InstructionMatrices.index
        AddedInstructionsLookUp[Index] = InstructionMatrices.instructions

    }
    let BaseMessage = `🕒 Block & Timestamp: ${Time} (${Interaction.slot})\n\n`

    for (const Instruction of Instructions) {
        index += 1
        let IntWProg = false
        const AddedInstructions = AddedInstructionsLookUp[index]
        if (AddedInstructions) {
            for (const NewInstruction of AddedInstructions) {
                const Parsed = NewInstruction.parsed
                if (!Parsed && Instruction.accounts.length > 0){
                    IntWProg = Instruction.programId
                }
            }
        } else {
        }
        let BaseInteractMsg = ``
        if (IntWProg) {
            BaseInteractMsg = `💻 Interact with program ${IntWProg}\n`
            const CurrentAdded = AddedInstructionsLookUp[index]
            for (const Individual of CurrentAdded) {
                const Parsed = Individual.parsed
                if (Parsed) {
                    const Type = Parsed.type
                    const ParsedInfo = Parsed.info
                    switch (Type) {
                        case "transfer":
                            const FromAcc = ParsedInfo.authority || ParsedInfo.source
                            const ToAcc = ParsedInfo.destination
                            const Amount = ParsedInfo.lamports / Bil || parseFloat(ParsedInfo.amount) / Bil //TODO fix amount
                            BaseInteractMsg += `📁 transfer from account: ${FromAcc} to SPL account: ${ToAcc} for: ${Amount} Tokens\n` 
                            continue
                        case "closeAccount":
                            BaseInteractMsg += `⛔ Close Token Account ${ParsedInfo.acocunt} \n\n` //TODO find out information where it says how much was liquidated
                            continue
                        }
                        console.error("missed case type")
                }
            }
            BaseMessage += BaseInteractMsg + "\n"

        }

        if (!Instruction.accounts) {
            const Parsed = Instruction.parsed
            const Type = Parsed.type
            const ParsedInfo = Parsed.info
            const ListedProgram = Instruction.programId.toBase58() || ParsedInfo.tokenProgram
            const Program = ProgramMapping[ListedProgram]
            if (!Program){
                BaseMessage += ListedProgram + "\n"
            }
            BaseInteractMsg = `📋 Interact with instruction ${Type} on ${Program}\n`
            switch (Type) {
                case "transfer":
                    BaseInteractMsg += `📁 transfer from account: ${ParsedInfo.authority || ParsedInfo.source} to SPL account: ${ParsedInfo.destination} for: ${(ParsedInfo.lamports|| parseFloat(ParsedInfo.amount))/Bil} Tokens\n\n`//TODO make it say which token
                    BaseMessage += BaseInteractMsg 
                    continue
                case "createAccountWithSeed":
                    BaseInteractMsg += `📥 Create ${ParsedInfo.newAccount} with a deposit of ${ParsedInfo.lamports / Bil} SOL from ${ParsedInfo.source}\n\n`
                    BaseMessage += BaseInteractMsg 
                    continue
                case "closeAccount":
                    BaseInteractMsg += `⛔ Close Token Account ${ParsedInfo.acocunt} \n\n` //TODO find out information where it says how much was liquidated
                    BaseMessage += BaseInteractMsg
                    continue
                case "initializeAccount":
                    //TODO fill this out
                    continue
                case "create":
                    BaseInteractMsg += `📥 Create ${ParsedInfo.account} with a deposit from ${ParsedInfo.source}\n\n` //TODO make it list amount of tokens created
                    BaseMessage += BaseInteractMsg
                    continue    
                case "createIdempotent":
                    BaseInteractMsg += `📥 Create ${ParsedInfo.account} with a deposit from ${ParsedInfo.source}\n\n` //TODO make it list amount of tokens created
                    BaseMessage += BaseInteractMsg
                    continue   
                case "transferChecked":
                    BaseInteractMsg += `📁 transfer from account: ${ParsedInfo.authority || ParsedInfo.source} to SPL account: ${ParsedInfo.destination} for: ${(ParsedInfo.lamports || parseFloat(ParsedInfo.amount))/Bil || ParsedInfo.tokenAmount.uiAmount} Tokens\n\n`//TODO make it say which token
                    BaseMessage += BaseInteractMsg
                    continue
            }
            console.log("missing type: ", Type)
        } else {
            //console.log("empty", Instruction)
        }
    }
    /*
    loggedMessages = Interaction.meta.logMessages
    BaseMessage += "====Log Messages====\n"
    for (const msg of loggedMessages){
        BaseMessage += msg + "\n"
    }
    BaseMessage += "===================="
    */
    return BaseMessage
}

module.exports = {ParseSignature}
