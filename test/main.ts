import TestModel from "./models/test"

async function main() {
	const newObj = TestModel.obj({
		key: "test",
		value: new Date().toISOString(),
	})

	newObj.save()

	const raw = newObj.toRaw()

	console.log(raw.value)
	console.log(newObj.value)

	const finded = await TestModel.findOne({ key: "test" })

	if (!finded) {
		console.log("not found")
		return
	}
	console.log(finded.value)

	finded.save()
}

main()
