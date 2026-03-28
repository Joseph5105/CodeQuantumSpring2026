export const mockQualities: Record<string, number> = {
    engine: 30,
    aerodynamics: 30,
    suspension: 30,
    transmission: 30,
    pitCrew: 30,
};

export const mockComponents: Record<string, {
    label: string;
    costPerPoint: number;
    description: string;
}> = {
    engine: {
        label: 'Power Unit',
        costPerPoint: 120000,
        description: 'V6 Turbo Hybrid',
    },
    aerodynamics: {
        label: 'Aerodynamics',
        costPerPoint: 95000,
        description: 'Ground Effect',
    },
    suspension: {
        label: 'Suspension',
        costPerPoint: 45000,
        description: 'Active Damping',
    },
    transmission: {
        label: 'Transmission',
        costPerPoint: 60000,
        description: '8-Speed Seamless',
    },
    pitCrew: {
        label: 'Pit Crew',
        costPerPoint: 30000,
        description: 'Reaction Drills',
    },
};

export const MOCK_INITIAL_BUDGET = 15000000;

export const getMockRemainingBudget = (qualities: Record<string, number>): number => {
    return MOCK_INITIAL_BUDGET - Object.entries(qualities).reduce((acc, [key, value]) => {
        return acc + (value * mockComponents[key].costPerPoint);
    }, 0);
};