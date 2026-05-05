const userMapper = {
    [RoleTypes.Gerente]: {
        create: true,
        edit: true,
        delete: true
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
    [RoleTypes.Jefe_Obra]: {
        create: true,
        edit: true,
        delete: false
    },
}

const dependencyTypesMapper = {
        [DependencyTypes.Fin_a_inicio]: 'Fin a Inicio',
        [DependencyTypes.Sin_dependencia]: 'Sin Dependencia'
}