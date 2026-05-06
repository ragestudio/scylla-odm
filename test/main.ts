import Client from "../src/client"
import Example from "./db/example"

async function main() {
	const client = new Client({
		// queryOptions: {
		// 	logged: true,
		// 	traceQuery: true,
		// },
		socketOptions: {
			tcpNoDelay: true,
		},
	})

	console.time("client.initialize")
	await client.initialize({
		sync: true,
	})
	console.timeEnd("client.initialize")

	console.time("Example.obj")
	const newObj = Example.obj({
		key: "test",
		value: new Date().toISOString(),
	})
	console.timeEnd("Example.obj")

	console.time("newObj.save")
	await newObj.save()
	console.timeEnd("newObj.save")

	console.time("newObj.toRaw")
	const raw = newObj.toRaw()
	console.timeEnd("newObj.toRaw")

	console.log(raw.key, raw.value)
	console.log(newObj.key, newObj.value)

	console.time("Example.findOne")
	const finded = await Example.findOne({ key: "test" })
	console.timeEnd("Example.findOne")

	if (!finded) {
		console.log("not found")
		return
	}

	console.log(finded)
}

main()
