async function logEvent(eventName, event){
    switch (eventName) {
        case "TerminateInstances":
            console.log("Terminate Instance event: ", event);
            const CloudTrailEvent = JSON.parse(event.CloudTrailEvent);
            const EventCommonData = {
                EventId: event.eventID,
                EventTime: event.eventTime,
                EventSource: event.eventSource,
                EventName: event.eventName, 
                awsRegion: CloudTrailEvent.awsRegion,
                sourceIPAddress: CloudTrailEvent.sourceIPAddress, 
                userAgent: CloudTrailEvent.userAgent,
                readOnly: event.readOnly,
                eventType: CloudTrailEvent.eventType,
                managementEvent: CloudTrailEvent.managementEvent,
                recipientAccountId: CloudTrailEvent.recipientAccountId,
                eventCategory: CloudTrailEvent.eventCategory,
                requestID: CloudTrailEvent.requestID,
                userType: CloudTrailEvent.userIdentity.type,
                principalId: CloudTrailEvent.userIdentity.principalId,
                userArn: CloudTrailEvent.userIdentity.arn,
                userName: CloudTrailEvent.userIdentity.userName,
                accessKeyId: event.AccessKeyId,
                accountId: CloudTrailEvent.userIdentity.accountId
            }
            const EventPrivateData = {
                EventId: event.EventId,
                instanceId: CloudTrailEvent.requestParameters.instancesSet.items[0].instanceId,
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
