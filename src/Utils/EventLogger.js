async function logEvent(eventName, event){
    switch (eventName) {
        case "TerminateInstances":
            console.log("Terminate Instance event: ", event);
            break;
        default:
            console.log("Unknown event: ", event);
    }
}


module.exports = {
	logEvent
}
