export const mockQualities: Record<string, number> = {
    engine: 30,
    aerodynamics: 30,
    suspension: 30,
    transmission: 30,
    pitCrew: 30,
};

export const mockComponents: Record<string, {
    label: string;
    description: string;
    maxCost: number;
}> = {
    engine: {
        label: 'Power Unit',
        description: 'V6 Turbo Hybrid',
        maxCost: 15_000_000,
    },
    aerodynamics: {
        label: 'Aerodynamics',
        description: 'Ground Effect',
        maxCost: 9_000_000,
    },
    suspension: {
        label: 'Suspension',
        description: 'Active Damping',
        maxCost: 6_000_000,
    },
    transmission: {
        label: 'Transmission',
        description: '8-Speed Seamless',
        maxCost: 7_000_000,
    },
    pitCrew: {
        label: 'Pit Crew',
        description: 'Reaction Drills',
        maxCost: 3_500_000,
    },
};

export const MOCK_INITIAL_BUDGET = 30_000_000;
export const DEFAULT_GAMMA = 1.5;

/**
 * Formula: Cost = MaxCost * (points / 100) ^ gamma
 */
export const calculateComponentCost = (points: number, maxCost: number, gamma: number = DEFAULT_GAMMA): number => {
    const ratio = Math.min(100, Math.max(0, points)) / 100;
    return Math.round(maxCost * Math.pow(ratio, gamma));
};

export const getMockRemainingBudget = (qualities: Record<string, number>): number => {
    const totalSpent = Object.entries(qualities).reduce((acc, [key, value]) => {
        const comp = mockComponents[key];
        if (!comp) return acc;
        return acc + calculateComponentCost(value, comp.maxCost);
    }, 0);
    return MOCK_INITIAL_BUDGET - totalSpent;
};