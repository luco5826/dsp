class MQTTMessage {
  /**
   *
   * @param {*} operation: CREATE | DELETE | UPDATE
   * @param {*} status: active | inactive | completed | other
   * @param {*} userId: if status = active/inactive then userId of the user of the task assigned to
   * @param {*} userName: if status = active/inactive then userId of the user of the task assigned to
   * @param {*} taskId: taskId of the task on which the operation refer to
   * @param {*} payload: representation of the task
   *
   */
  constructor(operation, status, userId, userName, taskId, payload) {
    this.operation = operation;
    this.status = status;
    this.userId = userId;
    this.userName = userName;
    this.taskId = taskId;
    this.payload = payload;
  }
}

module.exports = MQTTMessage;
