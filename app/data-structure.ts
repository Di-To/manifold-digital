export const EMPTY_STRING = '';
export const NOT_ASSIGN = 'NOT_ASSIGN' // valor para ids strings

export enum RoleTypes {
    Gerente = 'Gerente',
    Jefe_Obra = 'Jefe_Obra',
    Inspector = 'Inspector'
}

export enum ProjectStatusTypes {
    Planificacion = 'Planificacion',
    Activo = 'Activo',
    Pausado = 'Pausado',
    Finalizado = 'Finalizado'
}

export enum TaskStatusTypes {
    Pendiente = 'Pendiente',
    En_Curso = 'En_Curso',
    Completada = 'Completada',
    Bloqueada = 'Bloqueada'
}

export enum IncidentsStatusTypes {
    Abierta = 'Abierta',
    En_Revision = 'En_Revision',
    Resuelta = 'Resuelta'
}

export enum DependencyTypes {
    Fin_a_inicio = 'Fin_a_inicio',
    Sin_dependencia = 'Sin_dependencia'
}

export enum LogType {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

export enum SeverityIncidents {
    Baja = 'Baja',
    Media = 'Media',
    Alta = 'Alta',
    Critica = 'Critica'
}

export class UserInfo {
    id: string = NOT_ASSIGN;
    companyId: string = NOT_ASSIGN;
    name: string = EMPTY_STRING;
    email: string = EMPTY_STRING;
    password: string = EMPTY_STRING;
    role: RoleTypes = RoleTypes.Inspector;
    isActive: boolean = false;
    hiringDate: string = EMPTY_STRING;
    creationDate: string = EMPTY_STRING;
}

export class SystemLogActivityUserInfo {
    id: string = NOT_ASSIGN;
    userInfoAfter: UserInfo = Object.assign({}, new UserInfo());
    userInfoBefore: UserInfo = Object.assign({}, new UserInfo());
}

export class SystemLogActivityProject {
    id: string = NOT_ASSIGN;
    projectAfter: Project = Object.assign({}, new Project());
    projectBefore: Project = Object.assign({}, new Project());
}

export class SystemLogActivity {
    project: SystemLogActivityProject = Object.assign({}, new SystemLogActivityProject());
    userInfo: SystemLogActivityUserInfo = Object.assign({}, new SystemLogActivityUserInfo());
}

export class SystemLogs {
    id: string = NOT_ASSIGN;
    companyId: string = NOT_ASSIGN;
    timestamp: string = EMPTY_STRING;
    userId: string = NOT_ASSIGN;
    message: string = EMPTY_STRING;
    logType: LogType = LogType.INFO;
    activity: SystemLogActivity = Object.assign({}, new SystemLogActivity());
}

export class ProjectTaskReports {
    id: string = NOT_ASSIGN;
    taskId: string = NOT_ASSIGN;
    userId: string = NOT_ASSIGN;
    reportDate: string = EMPTY_STRING;
    reportPercentage: number = 0.0; 
    comments: string = EMPTY_STRING;
    urlEvidence: string = EMPTY_STRING;
}

export class ProjectTaskIncidents {
    id: string = NOT_ASSIGN;
    projectId: string = NOT_ASSIGN;
    taskId: string = NOT_ASSIGN;
    reportedBy: string = NOT_ASSIGN;
    incidentType: string = EMPTY_STRING;
    severity: SeverityIncidents = SeverityIncidents.Media;
    description: string = EMPTY_STRING;
    status: IncidentsStatusTypes = IncidentsStatusTypes.Abierta;
    creationDate: string = EMPTY_STRING;
    resolutionDate: string = EMPTY_STRING;
}

export class ProjectTaskDependencies {
    id: string = NOT_ASSIGN;
    taskId: string = NOT_ASSIGN;
    dependsTaskId: string = NOT_ASSIGN;
    dependencyType: DependencyTypes = DependencyTypes.Fin_a_inicio; 
}

export class ProjectTask {
    id: string = NOT_ASSIGN;
    projectId: string = NOT_ASSIGN;
    title: string = EMPTY_STRING;
    parentTaskId: string = EMPTY_STRING;
    description: string = EMPTY_STRING;
    startDate: string = EMPTY_STRING;
    endDate: string = EMPTY_STRING;
    status: TaskStatusTypes = TaskStatusTypes.Pendiente;
    progress: number = 0.0;
    assignedTo: string = NOT_ASSIGN;
    creationDate: string = EMPTY_STRING;
    dependencies: ProjectTaskDependencies[] = [Object.assign({}, new ProjectTaskDependencies())];
    reports: ProjectTaskReports[] = [Object.assign({}, new ProjectTaskReports())];
    incidents: ProjectTaskIncidents[] = [Object.assign({}, new ProjectTaskIncidents())];
}

export class Project {
    id: string = NOT_ASSIGN;
    companyId: string = NOT_ASSIGN;
    name: string = EMPTY_STRING;
    description: string = EMPTY_STRING;
    startDate: string = EMPTY_STRING;
    endDate: string = EMPTY_STRING;
    status: ProjectStatusTypes = ProjectStatusTypes.Activo;
    creationDate: string = EMPTY_STRING;
    tasks: ProjectTask[] = [Object.assign({}, new ProjectTask())];
}

export class Company {
    id: string = NOT_ASSIGN;
    name: string = EMPTY_STRING;
    rutTaxId: string = EMPTY_STRING;
    subscriptionPlan: string = EMPTY_STRING;
    creationDate: string = EMPTY_STRING;
    users: UserInfo[] = [Object.assign({}, new UserInfo())];
}

class AppData {
    userInfo: UserInfo =  Object.assign({}, new UserInfo());
    company: Company[] = [Object.assign({}, new Company())];
    projects: Project[] = [Object.assign({}, new Project())];
}

class ContractApp {
    data: AppData = Object.assign({}, new AppData());
};

const newContract = Object.assign({}, new ContractApp());

console.log(JSON.parse(JSON.stringify(newContract)));