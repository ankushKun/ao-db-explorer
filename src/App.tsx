import { useState } from "react"
import { connect, createDataItemSigner } from "@permaweb/aoconnect"
import { loader as dbAdminCode } from "./dba"

// phz1b6DT48Az_OdGUURgfkHgNqwveG1IyRc-1DDaSaU

const ao = connect()

async function runLua(pid: string, code: string) {
    const m_id = await ao.message({
        process: pid,
        data: code,
        tags: [
            { name: "Action", value: "Eval" },
            { name: "App-Name", value: "ao-db-explorer" }
        ],
        signer: createDataItemSigner(window.arweaveWallet)
    })

    const res = await ao.result({
        process: pid,
        message: m_id,
    })
    return res
}

function App() {
    const [_, setAddress] = useState("")
    const [pid, setPid] = useState("")

    const [tables, setTables] = useState<string[]>([])
    const [activeTable, setActiveTable] = useState<string>("")
    const [rows, setRows] = useState<any[]>([])

    const[status, setStatus] = useState<string[]>(["status"])

    function addStatus(s: string) {
        // max length of status should be 3
        setStatus(prev => {
            if (prev.length >= 3) {
                prev.shift()
            }
            return [...prev, s]
        })
    }


    async function loadProcess() {
        if (!pid) return alert("please enter a process id")

        await window.arweaveWallet.connect(["ACCESS_ADDRESS", "SIGN_TRANSACTION"])
        const addr = await window.arweaveWallet.getActiveAddress()
        if (!addr) return alert("please connect wallet")
        setAddress(addr)
        setTables([])
        setRows([])
        console.log("loading process", pid)

        try {
            addStatus("checking if sqlite exists")
            const reqSql = await runLua(pid, "sqlite3 = require('lsqlite3')")
            console.log("reqSql", reqSql)
            // if error -> non sqlite module
            if (reqSql.Error) return alert(Error)
        } catch (e) {
            return alert(e)
        }
        addStatus("sqlite exists!")

        addStatus("injecting db admin")
        // insert dbadmin package in the process
        const insDb = await runLua(pid, dbAdminCode)
        console.log(insDb)
        if (insDb.Error) return alert(insDb.Error)
        addStatus("db admin injected!")

        addStatus("creating db explorer instance & fetching tables")
        // create a new db explorer instance
        const newDba = await runLua(pid, `db = db or sqlite3.open_memory()
dbAdmin = require('DbAdmin').new(db)

return dbAdmin:tables()`)
        console.log(newDba)
        if (newDba.Error) return alert(newDba.Error)

        setTables(newDba.Output.data.json)
        addStatus(`${newDba.Output.data.json.length} tables fetched!`)

    }

    async function selectTable(name: string) {
        console.log("Selecting table", name)
        setActiveTable(name)
        setRows([])

        addStatus(`fetching rows from ${name}`)
        const selRes = await runLua(pid, `return dbAdmin:exec("SELECT * FROM ${name}")`)
        console.log(selRes)

        if (selRes.Error) return alert(selRes.Error)

        setRows(selRes.Output.data.json)
        addStatus(`${selRes.Output.data.json.length} rows fetched!`)

    }


    // async function addRow(){

    // }

    return (
        <div className=" min-h-screen max-w-screen">
            <div className="absolute left-1 top-1">{
                status.map((s, i) => (
                    <div key={i} className="text-xs text-left text-red-400">[{s}]</div>
                ))
            }</div>
            <div className="text-center font-medium my-2 text-2xl">AO DB Explorer</div>

            <div className="mx-auto w-fit">
            <input placeholder="enter sqlite3 process id" onChange={e => setPid(e.target.value)} className="ring-1 ring-black rounded-md p-1 px-2" />
            <button className="rounded-md bg-green-300 p-1 px-2 inline-block mx-2" onClick={loadProcess}>load</button>
            </div>
            <hr className="mt-4" />
            <div className="flex h-screen w-screen overflow-scroll font-mono">
                <div className="border-r">
                    <div className="border-b text-center">Tables ({tables.length})</div>
                    {
                        tables.map((table, i) => (
                            <div key={i} data-selected={table == activeTable} className="text-left border-b p-1 cursor-pointer hover:bg-black/5 active:bg-black/10 data-[selected=true]:bg-black/10"
                                onClick={() => selectTable(table)}
                            >{table}</div>
                        ))
                    }
                </div>
                <div className="">
                    <div className="border-b text-left px-2">Rows ({rows.length})</div>
                    <div className="">
                        <table className="w-full">
                            <thead>
                                <tr className="">
                                    {
                                        rows.length > 0 && Object.keys(rows[0]).reverse().map((key, i) => (
                                            <th key={i} className="p-1 border text-center">{key}</th>
                                        ))
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    rows.map((row, i) => (
                                        <tr key={i}>
                                            {
                                                Object.values(row).reverse().map((val: any, j) => (
                                                    <td key={j} className="max-w-[250px] p-1 text-center overflow-scroll border">{val}</td>
                                                ))
                                            }
                                        </tr>
                                    ))
                                }
                                {/*  add new row option, show row headers ad label and an input */}
                                {/* <tr> */}
                                {/*     { */}
                                {/*         Object.keys(rows[0]).reverse().map((key, i) => ( */}
                                {/*             <td key={i} className="max-w-[250px] p-1 overflow-scroll border"> */}
                                {/*                 <input type="text" className="w-full ring-1 ring-black/5 p-0.5" placeholder={key} /> */}
                                {/*             </td> */}
                                {/*         )) */}
                                {/*     } */}
                                {/* </tr> */}
                            </tbody>
                        </table>
                        {/* <button className="text-left mr-auto p-1 px-2 m-2 rounded-md bg-green-400" onClick={addRow}>add row</button> */}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
