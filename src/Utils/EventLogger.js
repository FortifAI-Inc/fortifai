async function logEvent(eventName, event){
    switch (eventName) {
        case "TerminateInstances":
            console.log("Terminate Instance event: ", event);
            const EventCommonData = {
                eventID: event.eventID,
                eventTime: event.eventTime,
                eventSource: event.eventSource,
                eventName: event.eventName, 
                awsRegion: event.CloudTrailEvent.awsRegion,
                sourceIPAddress: event.CloudTrailEvent.sourceIPAddress, 
                userAgent: event.CloudTrailEvent.userAgent,
                readOnly: event.readOnly,
                eventType: event.CloudTrailEvent.eventType,
                managementEvent: event.CloudTrailEvent.managementEvent,
                recipientAccountId: event.CloudTrailEvent.recipientAccountId,
                eventCategory: event.CloudTrailEvent.eventCategory,
                requestID: event.CloudTrailEvent.requestID,
                userType: event.userIdentity.type,
                principalId: event.userIdentity.principalId,
                userArn: event.userIdentity.arn,
                userName: event.userIdentity.userName,
                accessKeyId: event.AccessKeyId,
                accountId: event.userIdentity.accountId
            }
            const EventPrivateData = {
                eventID: event.eventID,
                instanceId: event.CloudTrailEvent.requestParameters.instancesSet.items[0].instanceId,
            }
            console.log("EventCommonData: ", EventCommonData);
            console.log("EventPrivateData: ", EventPrivateData);
            break;
        default:
            console.log("Unknown event: ", event);
    }
}


module.exports = {
	logEvent
}
