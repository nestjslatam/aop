export interface IMethodInfo {
  /** Method name, equivalent to `MethodInfo.Name`. */
  name: string;
  /** Parameter type names resolved from `design:paramtypes`. */
  parameterTypes: string[];
  /** Return type name resolved from `design:returntype`, when available. */
  returnType?: string;
  descriptor?: PropertyDescriptor;
}
