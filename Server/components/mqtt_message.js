
class MQTTMessage {
    /**
     * 
     * @param {*} operation: CREATE | DELETE | UPDATE | ASSIGN
     * @param {*} status: active | inactive | public | private | other
     * @param {*} userId: if ASSIGN then user of the user of the task assigned to 
     * @param {*} userName: if ASSIGN then userName of the task assigned to
     * @param {*} taskId: taskId of the task on which the operation refer to 
     * @param {*} payload: schema of the task 
     * 
     */
    constructor(operation, status, userId, userName, taskId, payload) {
        this.operation = operation;
        this.status = status;
        this.userId = userId;
        this.userName = userName;
        this.taskId = taskId;
        this.payload = payload;
        // if (operation === 'active') {
        //     this.userId = userId;
        //     this.userName = userName
        // }
    }
}

module.exports = MQTTMessage;