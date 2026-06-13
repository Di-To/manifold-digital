import { RoleTypes, SeverityIncidents, DependencyTypes, ProjectStatusTypes, TaskStatusTypes, IncidentsStatusTypes } from './data-structure';

export interface RolePermissionConfig {
    create: boolean;
    edit: boolean;
    delete: boolean;
    availableSeverityIncidents: SeverityIncidents[];
}

export const userRoleConfig: Record<RoleTypes, RolePermissionConfig> = {
    [RoleTypes.Gerente]: {
        create: true,
        edit: true,
        delete: true,
        availableSeverityIncidents: [
            SeverityIncidents.Baja,
            SeverityIncidents.Media,
            SeverityIncidents.Alta,
            SeverityIncidents.Critica
        ]
    },
    [RoleTypes.Jefe_Obra]: {
        create: true,
        edit: true,
        delete: false,
        availableSeverityIncidents: [
            SeverityIncidents.Baja,
            SeverityIncidents.Media,
            SeverityIncidents.Alta
        ]
    },
    [RoleTypes.Inspector]: {
        create: true,
        edit: true,
        delete: false,
        availableSeverityIncidents: [
            SeverityIncidents.Baja,
            SeverityIncidents.Media
        ]
    }
};

export const dependencyTypesLabel: Record<DependencyTypes, string> = {
    [DependencyTypes.Fin_a_inicio]: 'Fin a Inicio',
    [DependencyTypes.Sin_dependencia]: 'Sin Dependencia'
};

export const projectStatusLabel: Record<ProjectStatusTypes, string> = {
    [ProjectStatusTypes.Planificacion]: "Planificación",
    [ProjectStatusTypes.Activo]: "Activo",
    [ProjectStatusTypes.Pausado]: "Pausado",
    [ProjectStatusTypes.Finalizado]: "Finalizado",
};

export const taskStatusLabel: Record<TaskStatusTypes, string> = {
    [TaskStatusTypes.Pendiente]: "Pendiente",
    [TaskStatusTypes.En_Curso]: "En Curso",
    [TaskStatusTypes.Completada]: "Completada",
    [TaskStatusTypes.Bloqueada]: "Bloqueada",
};

export const incidentStatusLabel: Record<IncidentsStatusTypes, string> = {
    [IncidentsStatusTypes.Abierta]: "Abierta",
    [IncidentsStatusTypes.En_Revision]: "En Revisión",
    [IncidentsStatusTypes.Resuelta]: "Resuelta",
};