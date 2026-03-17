import { generateImage, editImage } from '../../routes/table/ai.remote';

export type GenerationTask = {
	result: Promise<{ imageUrl: string }>;
	readonly progress: number;
	cancel: () => void;
	readonly isActive: boolean;
	readonly status: string;
	readonly message: string;
};

export type EditTask = {
	result: Promise<{ imageUrl: string }>;
	readonly progress: number;
	cancel: () => void;
	readonly isActive: boolean;
	readonly status: string;
	readonly message: string;
};

export function createGenerationTask(
    personaId: string,
    prompt: string,
    tableId?: string
): GenerationTask {
    let isActive = $state(true);
    let progress = $state(0);
    let status = $state('IN_PROGRESS');
    let message = $state('Generating image...');
    let cancelFlag = false;

    const result = (async () => {
        let interval: ReturnType<typeof setInterval> | null = null;
        try {
            // Simulate progress while awaiting server
            interval = setInterval(() => {
                if (progress < 90 && !cancelFlag) {
                    progress = Math.min(90, progress + Math.random() * 20);
                }
            }, 400);

            const response = await generateImage({ prompt, personaId, tableId });

            progress = 100;
            status = 'COMPLETED';
            message = 'Done';
            isActive = false;
            return { imageUrl: response.data.imageUrl };
        } catch (err) {
            status = 'FAILED';
            message = 'Failed';
            isActive = false;
            throw err;
        } finally {
            if (interval) clearInterval(interval);
        }
    })();

    return {
        result,
        get progress() {
            return Math.round(progress);
        },
        get status() {
            return status;
        },
        get message() {
            return message;
        },
        get isActive() {
            return isActive;
        },
        cancel: () => {
            cancelFlag = true;
            isActive = false;
            progress = 0;
        }
    };
}

export function createEditTask(
    imageUrl: string,
    editPrompt: string,
    personaId?: string,
    tableId?: string
): EditTask {
    let isActive = $state(true);
    let progress = $state(0);
    let status = $state('IN_PROGRESS');
    let message = $state('Editing image...');
    let cancelFlag = false;

    const result = (async () => {
        let interval: ReturnType<typeof setInterval> | null = null;
        try {
            interval = setInterval(() => {
                if (progress < 90 && !cancelFlag) {
                    progress = Math.min(90, progress + Math.random() * 20);
                }
            }, 400);

            const response = await editImage({ imageUrl, editPrompt, personaId, tableId });

            progress = 100;
            status = 'COMPLETED';
            message = 'Done';
            isActive = false;
            return { imageUrl: response.imageUrl };
        } catch (err) {
            status = 'FAILED';
            message = 'Failed';
            isActive = false;
            throw err;
        } finally {
            if (interval) clearInterval(interval);
        }
    })();

    return {
        result,
        get progress() {
            return Math.round(progress);
        },
        get status() {
            return status;
        },
        get message() {
            return message;
        },
        get isActive() {
            return isActive;
        },
        cancel: () => {
            cancelFlag = true;
            isActive = false;
            progress = 0;
        }
    };
}
