const EMPTY_STRING = '';
const NOT_ASSIGN = 'NOT_ASSIGN' // valor para ids strings

const RoleTypes = {
    Gerente: 'Gerente',
    Jefe_Obra: 'Jefe_Obra',
    Inspector: 'Inspector'
}

const ProjectStatusTypes = {
    Planificacion: 'Planificacion',
    Activo: 'Activo',
    Pausado: 'Pausado',
    Finalizado: 'Finalizado'
}

const TaskStatusTypes = {
    Pendiente: 'Pendiente',
    En_Curso: 'En_Curso',
    Completada: 'Completada',
    Bloqueada: 'Bloqueada'
}

const IncidentsStatusTypes = {
    Abierta: 'Abierta',
    En_Revision: 'En_Revision',
    Resuelta: 'Resuelta'
}

const DependencyTypes = {
    Fin_a_inicio: 'Fin_a_inicio',
    Sin_dependencia: 'Sin_dependencia'
}

const LogType = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR'
}

const SeverityIncidents = {
    Baja: 'Baja',
    Media: 'Media',
    Alta: 'Alta',
    Critica: 'Critica'
}

class SystemLogActivityUserInfo {
    id = NOT_ASSIGN;
    userInfoAfter = Object.assign({}, new UserInfo());
    userInfoBefore = Object.assign({}, new UserInfo());
}

class SystemLogActivityProject {
    id = NOT_ASSIGN;
    projectAfter = Object.assign({}, new Project());
    projectBefore = Object.assign({}, new Project());
}

class SystemLogActivity {
    project = Object.assign({}, new SystemLogActivityProject());
    userInfo = Object.assign({}, new SystemLogActivityUserInfo());
}

class SystemLogs {
    id = NOT_ASSIGN;
    companyId = NOT_ASSIGN;
    timeStap = EMPTY_STRING;
    userId = NOT_ASSIGN;
    messaje = EMPTY_STRING;
    logType = LogType.INFO;
    activity = Object.assign({}, new SystemLogActivity());
}

class UserInfo {
    id = NOT_ASSIGN;
    companyId = NOT_ASSIGN;
    name = EMPTY_STRING;
    email = EMPTY_STRING;
    password = EMPTY_STRING;
    role = RoleTypes.Inspector;
    isActive = false;
    hiringDate = EMPTY_STRING;
    creationDate = EMPTY_STRING;
}

class ProjectTaskReports {
    id = NOT_ASSIGN;
    taskId = NOT_ASSIGN;
    userId = NOT_ASSIGN;
    reportDate = EMPTY_STRING;
    reportPercentage = 0.0; 
    comments = EMPTY_STRING;
    urlEvidence = EMPTY_STRING;
}

class ProjectTaskIncidents {
    id = NOT_ASSIGN;
    proyectId = NOT_ASSIGN;
    taskId = NOT_ASSIGN;
    reportedBy = NOT_ASSIGN;
    incidentType = EMPTY_STRING;
    severity = SeverityIncidents.Media;
    description = EMPTY_STRING;
    status = IncidentsStatusTypes.Abierta;
    creationDate = EMPTY_STRING;
    resolutionDate = EMPTY_STRING;
}

class ProjectTaskDependencies {
    id = NOT_ASSIGN;
    taskId = NOT_ASSIGN;
    dependsTaskId = NOT_ASSIGN;
    dependencyType = DependencyTypes.Fin_a_inicio; 
}

class ProjectTask {
    id = NOT_ASSIGN;
    projectId = NOT_ASSIGN;
    title = EMPTY_STRING;
    parentTaskId = null;
    description = EMPTY_STRING;
    startDate = EMPTY_STRING;
    endDate = EMPTY_STRING;
    status = TaskStatusTypes.Pendiente;
    progress = 0.0;
    assignedTo = NOT_ASSIGN;
    creationDate = EMPTY_STRING;
    dependencies = [Object.assign({}, new ProjectTaskDependencies())];
    reports = [Object.assign({}, new ProjectTaskReports())];
    incidents = [Object.assign({}, new ProjectTaskIncidents())];
}

class Project {
    id = NOT_ASSIGN;
    companyId = NOT_ASSIGN;
    name = EMPTY_STRING;
    description = EMPTY_STRING;
    startDate = EMPTY_STRING;
    endDate = EMPTY_STRING;
    status = ProjectStatusTypes.Activo;
    creationDate = EMPTY_STRING;
    tasks = [Object.assign({}, new ProjectTask())];
}

class Company {
    id = NOT_ASSIGN;
    name = EMPTY_STRING;
    rutTaxId = EMPTY_STRING;
    subscriptionPlan = EMPTY_STRING;
    creationDate = EMPTY_STRING;
    users = [Object.assign({}, new UserInfo())];
}

class AppData {
    userInfo =  Object.assign({}, new UserInfo());
    company = [Object.assign({}, new Company())];
    projects = [Object.assign({}, new Project())];
}

class ContractApp {
    data = Object.assign({}, new AppData());
};

const newContract = Object.assign({}, new ContractApp());

console.log(JSON.parse(JSON.stringify(newContract)));