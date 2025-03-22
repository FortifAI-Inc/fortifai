//const classifier = new AIClassifier();
//const analysis = classifier.analyzeInstance(processes, files);

//console.log('AI Workload Analysis:', analysis.summary);
//console.log('Confidence Explanation:', analysis.confidenceExplanation);
//console.log('Detected Frameworks:', analysis.summary.detectedFrameworks);
//console.log('Model Types:', analysis.summary.detectedModelTypes);


class AIClassifier {
    // Expanded AI-related indicators with categorization
    #AI_INDICATORS = {
        frameworks: {
            tensorflow: {
                weight: 0.4,
                processes: ['tensorflow', 'tensorboard', 'tf-agent'],
                files: ['.pb', '.pbtxt', '.tf', '.tflite', '.ckpt'],
                dirs: ['/tensorflow/', '/tf_models/', '/tb_logs/']
            },
            pytorch: {
                weight: 0.4,
                processes: ['torch', 'pytorch', 'torchserve', 'torch_cuda'],
                files: ['.pt', '.pth', '.pytorch'],
                dirs: ['/torch/', '/pytorch/', '/lightning_logs/']
            },
            huggingface: {
                weight: 0.5,
                processes: ['transformers', 'huggingface', 'hf-cli'],
                files: ['.bin', '.safetensors', '.model'],
                dirs: ['/huggingface/', '/transformers/', '/hf_cache/']
            },
            openai: {
                weight: 0.6,
                processes: ['openai', 'gpt', 'dall-e', 'whisper'],
                files: ['.openai', 'openai.key'],
                dirs: ['/openai/', '/gpt_models/']
            },
            onnx: {
                weight: 0.4,
                processes: [
                    'onnxruntime', 
                    'onnx-server', 
                    'onnxruntime_pybind11_state',
                    'ort_main',
                    'onnx_tool'
                ],
                files: [
                    '.onnx',           // ONNX model files
                    '.ort',            // ONNX Runtime optimized files
                    'model.json',      // Common ONNX model config
                    '.prototxt'        // Model architecture files
                ],
                dirs: [
                    '/onnx/',
                    '/onnxruntime/',
                    '/ONNXModels/',
                    '/ort_models/',
                    '/site-packages/onnx/',
                    '/site-packages/onnxruntime/'
                ]
            }
        },
        llm_apis: {
            openai_api: {
                weight: 0.7,
                processes: ['openai-api', 'chatgpt-api', 'gpt-3', 'gpt-4', 'davinci-api'],
                files: ['openai.json', '.env', 'openai_config.yaml'],
                dirs: ['/openai_cache/', '/gpt_responses/']
            },
            anthropic: {
                weight: 0.7,
                processes: ['claude-api', 'anthropic-api', 'claude-2', 'claude-instant', 'claude-3'],
                files: ['anthropic.key', 'claude_config.json'],
                dirs: ['/anthropic/', '/claude_cache/']
            },
            google: {
                weight: 0.7,
                processes: ['gemini-api', 'palm-api', 'bard-api', 'vertex-ai'],
                files: ['google_ai.json', 'gemini_config.yaml'],
                dirs: ['/google_ai/', '/gemini_cache/']
            },
            cohere: {
                weight: 0.6,
                processes: ['cohere-api', 'command-api', 'cohere-embed'],
                files: ['cohere.key', 'cohere_config.json'],
                dirs: ['/cohere_cache/']
            },
            mistral: {
                weight: 0.6,
                processes: ['mistral-api', 'mistral-large', 'mistral-medium', 'mistral-small'],
                files: ['mistral.key', 'mistral_config.yaml'],
                dirs: ['/mistral_cache/']
            },
            meta: {
                weight: 0.6,
                processes: ['llama-api', 'llama2-api', 'llama-70b', 'code-llama'],
                files: ['meta_ai.key', 'llama_config.json'],
                dirs: ['/meta_cache/', '/llama_responses/']
            },
            ai21: {
                weight: 0.6,
                processes: ['jurassic-api', 'j2-ultra', 'j2-mid'],
                files: ['ai21.key', 'jurassic_config.json'],
                dirs: ['/ai21_cache/']
            },
            amazon: {
                weight: 0.6,
                processes: ['bedrock-api', 'titan-api', 'claude-bedrock'],
                files: ['aws_ai.json', 'bedrock_config.yaml'],
                dirs: ['/aws_ai/', '/bedrock_cache/']
            },
            inflection: {
                weight: 0.6,
                processes: ['inflection-api', 'pi-api'],
                files: ['inflection.key', 'pi_config.json'],
                dirs: ['/inflection_cache/']
            },
            perplexity: {
                weight: 0.6,
                processes: ['perplexity-api', 'pplx-api', 'perplexity-online'],
                files: ['perplexity.key', 'pplx_config.yaml'],
                dirs: ['/perplexity_cache/']
            },
            groq: {
                weight: 0.6,
                processes: ['groq-api', 'mixtral-groq', 'llama2-groq'],
                files: ['groq.key', 'groq_config.json'],
                dirs: ['/groq_cache/']
            },
            deepinfra: {
                weight: 0.6,
                processes: ['deepinfra-api', 'deepinfra-inference'],
                files: ['deepinfra.key', 'deepinfra_config.yaml'],
                dirs: ['/deepinfra_cache/']
            },
            together: {
                weight: 0.6,
                processes: ['together-api', 'together-inference'],
                files: ['together.key', 'together_config.json'],
                dirs: ['/together_cache/']
            },
            anyscale: {
                weight: 0.6,
                processes: ['anyscale-api', 'endpoints-api'],
                files: ['anyscale.key', 'endpoints_config.yaml'],
                dirs: ['/anyscale_cache/']
            },
            replicate: {
                weight: 0.6,
                processes: ['replicate-api', 'cog-api'],
                files: ['replicate.key', 'cog_config.json'],
                dirs: ['/replicate_cache/']
            },
            fireworks: {
                weight: 0.6,
                processes: ['fireworks-api', 'fireworks-inference'],
                files: ['fireworks.key', 'fireworks_config.yaml'],
                dirs: ['/fireworks_cache/']
            },
            deepseek: {
                weight: 0.6,
                processes: ['deepseek-api', 'deepseek-coder', 'deepseek-chat'],
                files: ['deepseek.key', 'deepseek_config.yaml'],
                dirs: ['/deepseek_cache/', '/deepseek_responses/']
            }
        },
        hardware: {
            nvidia: {
                weight: 0.3,
                processes: ['nvidia-smi', 'nvidia-docker', 'cudnn', 'nvml'],
                files: ['.cuda', '.cudnn'],
                dirs: ['/cuda/', '/nvidia/', '/gpu/']
            },
            amd: {
                weight: 0.2,
                processes: ['rocm', 'hipcc', 'amdgpu'],
                files: ['.rocm'],
                dirs: ['/rocm/', '/amd/']
            }
        },
        tools: {
            jupyter: {
                weight: 0.2,
                processes: ['jupyter', 'ipython', 'notebook'],
                files: ['.ipynb'],
                dirs: ['/jupyter/', '/notebooks/']
            },
            mlflow: {
                weight: 0.3,
                processes: ['mlflow', 'mlrun'],
                files: ['.mlflow', 'MLproject'],
                dirs: ['/mlruns/', '/mlflow/']
            },
            wandb: {
                weight: 0.3,
                processes: ['wandb', 'weights-and-biases'],
                files: ['.wandb'],
                dirs: ['/wandb/']
            }
        },
        languages: {
            python: {
                weight: 0.1,
                processes: ['python3', 'pip', 'conda'],
                files: ['.py', 'requirements.txt', 'environment.yml'],
                dirs: ['/site-packages/', '/conda/']
            },
            java: {
                weight: 0.1,
                processes: ['java', 'gradle', 'maven'],
                files: ['.jar', '.war', 'pom.xml'],
                dirs: ['/dl4j/', '/deeplearning4j/']
            }
        }
    };

    // Additional specific model names and types
    #MODEL_TYPES = {
        vision: {
            weight: 0.4,
            patterns: ['yolo', 'resnet', 'efficientnet', 'vit', 'ssd', 'mask-rcnn', 'onnx_resnet', 'onnx_mobilenet', 'onnx_detection', 'onnx_segmentation']
        },
        nlp: {
            weight: 0.5,
            patterns: ['bert', 'gpt', 'llama', 't5', 'roberta', 'bart', 'onnx_bert', 'onnx_gpt', 'onnx_transformer']
        },
        audio: {
            weight: 0.3,
            patterns: ['wav2vec', 'whisper', 'deepspeech', 'fastpitch']
        },
        generative: {
            weight: 0.6,
            patterns: ['stable-diffusion', 'dall-e', 'midjourney', 'gan']
        }
    };

    // Memory thresholds for different types of AI workloads
    #MEMORY_THRESHOLDS = {
        LARGE_MODEL: 8000000,  // 8GB
        MEDIUM_MODEL: 4000000, // 4GB
        SMALL_MODEL: 1000000   // 1GB
    };

    analyzeProcesses(processList) {
        const findings = {
            suspectedAIProcesses: [],
            gpuUsage: false,
            aiLibraries: new Set(),
            modelTypes: new Set(),
            memoryUsage: {
                highMemoryProcesses: [],
                totalAIRelatedMemory: 0
            },
            confidence: 0,
            details: [],
            frameworksDetected: new Set()
        };

        processList.forEach(process => {
            if (!process.trim()) return;

            const parts = process.split(/\s+/);
            const command = parts.slice(10).join(' ');
            const memUsage = parseInt(parts[5]);

            // Check all framework indicators
            Object.entries(this.#AI_INDICATORS).forEach(([category, categoryData]) => {
                Object.entries(categoryData).forEach(([framework, data]) => {
                    data.processes.forEach(processPattern => {
                        if (command.toLowerCase().includes(processPattern.toLowerCase())) {
                            findings.frameworksDetected.add(framework);
                            findings.confidence += data.weight;
                            findings.details.push(`${framework} process detected: ${command}`);
                            findings.suspectedAIProcesses.push({
                                framework,
                                command,
                                memoryMB: memUsage / 1024
                            });
                        }
                    });
                });
            });

            // Check model types
            Object.entries(this.#MODEL_TYPES).forEach(([type, data]) => {
                data.patterns.forEach(pattern => {
                    if (command.toLowerCase().includes(pattern.toLowerCase())) {
                        findings.modelTypes.add(type);
                        findings.confidence += data.weight;
                        findings.details.push(`${type} model detected in process: ${command}`);
                    }
                });
            });

            // Memory analysis
            if (memUsage > this.#MEMORY_THRESHOLDS.SMALL_MODEL) {
                findings.memoryUsage.highMemoryProcesses.push({
                    command,
                    memoryMB: memUsage / 1024
                });
                findings.memoryUsage.totalAIRelatedMemory += memUsage;
                
                if (memUsage > this.#MEMORY_THRESHOLDS.LARGE_MODEL) {
                    findings.confidence += 0.3;
                    findings.details.push(`Large memory footprint detected: ${memUsage / 1024}MB`);
                }
            }
        });

        findings.confidence = Math.min(findings.confidence, 1);
        findings.frameworksDetected = Array.from(findings.frameworksDetected);
        findings.modelTypes = Array.from(findings.modelTypes);

        return findings;
    }

    analyzeFilesystem(fileList) {
        const findings = {
            modelFiles: [],
            aiLibraries: new Set(),
            suspectedAIDirectories: new Set(),
            frameworksDetected: new Set(),
            modelTypes: new Set(),
            confidence: 0,
            details: [],
            statistics: {
                totalModelFiles: 0,
                frameworkDistribution: {},
                modelSizes: {
                    small: 0,    // < 100MB
                    medium: 0,   // 100MB - 1GB
                    large: 0     // > 1GB
                }
            }
        };

        fileList.forEach(file => {
            if (!file.trim()) return;

            // Check frameworks and their files
            Object.entries(this.#AI_INDICATORS).forEach(([category, categoryData]) => {
                Object.entries(categoryData).forEach(([framework, data]) => {
                    // Check file extensions
                    data.files.forEach(ext => {
                        if (file.toLowerCase().endsWith(ext)) {
                            findings.frameworksDetected.add(framework);
                            findings.modelFiles.push(file);
                            findings.confidence += data.weight;
                            findings.details.push(`${framework} model file detected: ${file}`);
                        }
                    });

                    // Check directories
                    data.dirs.forEach(dir => {
                        if (file.includes(dir)) {
                            findings.suspectedAIDirectories.add(dir);
                            findings.confidence += data.weight * 0.5;
                            findings.statistics.frameworkDistribution[framework] = 
                                (findings.statistics.frameworkDistribution[framework] || 0) + 1;
                        }
                    });
                });
            });

            // Check for model types
            Object.entries(this.#MODEL_TYPES).forEach(([type, data]) => {
                data.patterns.forEach(pattern => {
                    if (file.toLowerCase().includes(pattern.toLowerCase())) {
                        findings.modelTypes.add(type);
                        findings.confidence += data.weight;
                        findings.details.push(`${type} model file detected: ${file}`);
                    }
                });
            });
        });

        findings.confidence = Math.min(findings.confidence, 1);
        findings.frameworksDetected = Array.from(findings.frameworksDetected);
        findings.modelTypes = Array.from(findings.modelTypes);
        findings.aiLibraries = Array.from(findings.aiLibraries);
        findings.suspectedAIDirectories = Array.from(findings.suspectedAIDirectories);

        return findings;
    }

    analyzeInstance(processList, fileList) {
        const processAnalysis = this.analyzeProcesses(processList);
        const filesystemAnalysis = this.analyzeFilesystem(fileList);

        // Combine and correlate findings
        const combinedAnalysis = {
            overallConfidence: Math.max(processAnalysis.confidence, filesystemAnalysis.confidence),
            processAnalysis,
            filesystemAnalysis,
            summary: {
                isLikelyAIWorkload: Math.max(processAnalysis.confidence, filesystemAnalysis.confidence) > 0.5,
                activeAIProcesses: processAnalysis.suspectedAIProcesses.length > 0,
                hasAILibraries: processAnalysis.aiLibraries.length > 0 || filesystemAnalysis.aiLibraries.length > 0,
                usesGPU: processAnalysis.gpuUsage,
                detectedFrameworks: new Set([...processAnalysis.frameworksDetected, ...filesystemAnalysis.frameworksDetected]),
                detectedModelTypes: new Set([...processAnalysis.modelTypes, ...filesystemAnalysis.modelTypes])
            },
            confidenceExplanation: this.generateConfidenceExplanation(processAnalysis, filesystemAnalysis)
        };

        combinedAnalysis.summary.detectedFrameworks = Array.from(combinedAnalysis.summary.detectedFrameworks);
        combinedAnalysis.summary.detectedModelTypes = Array.from(combinedAnalysis.summary.detectedModelTypes);

        return combinedAnalysis;
    }

    generateConfidenceExplanation(processAnalysis, filesystemAnalysis) {
        const explanation = {
            factors: [],
            highConfidenceIndicators: [],
            mediumConfidenceIndicators: [],
            lowConfidenceIndicators: []
        };

        // Process high-confidence indicators
        if (processAnalysis.gpuUsage) {
            explanation.highConfidenceIndicators.push('GPU usage detected');
        }
        if (processAnalysis.frameworksDetected.includes('openai') || 
            processAnalysis.frameworksDetected.includes('huggingface')) {
            explanation.highConfidenceIndicators.push('Major AI frameworks detected');
        }

        // Process medium-confidence indicators
        if (processAnalysis.memoryUsage.highMemoryProcesses.length > 0) {
            explanation.mediumConfidenceIndicators.push(
                `${processAnalysis.memoryUsage.highMemoryProcesses.length} high-memory processes detected`
            );
        }
        if (filesystemAnalysis.modelFiles.length > 0) {
            explanation.mediumConfidenceIndicators.push(
                `${filesystemAnalysis.modelFiles.length} model files found`
            );
        }

        // Process low-confidence indicators
        if (filesystemAnalysis.aiLibraries.length > 0) {
            explanation.lowConfidenceIndicators.push(
                `${filesystemAnalysis.aiLibraries.length} AI-related libraries installed`
            );
        }

        return explanation;
    }
}

module.exports = AIClassifier;