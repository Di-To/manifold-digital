import { RoleTypes } from './data-structure'
import { SeverityIncidents } from './data-structure'
import { DependencyTypes } from './data-structure'

export const userMapper = {
    [RoleTypes.Gerente]: {
        create: true,
        edit: true,
        delete: true,
        availableSeverityIncidents: [
            SeverityIncidents.Baja,
            SeverityIncidents.Media,
            SeverityIncidents.Alta,
            SeverityIncidents.Alta
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
    },
}

export const dependencyTypesMapper = {
    [DependencyTypes.Fin_a_inicio]: 'Fin a Inicio',
    [DependencyTypes.Sin_dependencia]: 'Sin Dependencia'
}