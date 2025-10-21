export interface Template {
  scaffold(project: Project, spec: any, ctx: Ctx): Promise<void>;
  build(project: Project, spec: any, ctx: Ctx): Promise<void>;
  deploy(project: Project, spec: any, ctx: Ctx): Promise<void>;
  verify(project: Project, spec: any, ctx: Ctx): Promise<void>;
  publish(project: Project, spec: any, ctx: Ctx): Promise<void>;
}

export interface Ctx {
  artifactsDir: string;        // `${OUTPUT_DIR}/${project.id}`
  addArtifact: (kind: string, relPath: string, meta?: any) => Promise<void>;
  logger: (msg: string, meta?: any) => void;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  templateRef: string;
  spec: any;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}
