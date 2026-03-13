import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

/**
 * Vision Service - Handles real-time local object detection
 * Replaces Android ML Kit with TensorFlow.js COCO-SSD
 */
class VisionService {
    constructor() {
        this.model = null;
        this.isLoaded = false;
    }

    /**
     * Loads the TensorFlow.js object detection model
     */
    async loadModel() {
        if (this.isLoaded) return;

        console.log("Loading TensorFlow COCO-SSD model...");
        // Force backend to webgl for better performance if available, fallback to cpu
        try {
            await tf.setBackend('webgl');
            await tf.ready();
        } catch (e) {
            console.warn("WebGL not supported, falling back to CPU", e);
            await tf.setBackend('cpu');
        }

        this.model = await cocoSsd.load();
        this.isLoaded = true;
        console.log("Model loaded successfully");
    }

    /**
     * Detect objects in a video or image element
     * @param {HTMLVideoElement | HTMLImageElement | HTMLCanvasElement} element 
     * @returns {Promise<Array<{class: string, score: number, bbox: number[]}>>}
     */
    async detectObjects(element) {
        if (!this.isLoaded || !this.model) {
            await this.loadModel();
        }

        try {
            // Returns an array of prediction objects:
            // { bbox: [x, y, width, height], class: "person", score: 0.8380282521247864 }
            const predictions = await this.model.detect(element);
            return predictions;
        } catch (e) {
            console.error("Object detection failed:", e);
            return [];
        }
    }

    /**
     * Convenience method to extract just the unique class names from predictions
     */
    async getUniqueLabels(element) {
        const predictions = await this.detectObjects(element);
        const labels = predictions.map(p => p.class);
        // Return unique labels
        return [...new Set(labels)];
    }
}

export default new VisionService();
