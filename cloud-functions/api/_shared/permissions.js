export const ROLES = ['admin', 'manager', 'clerk'];

export const ROLE_LABELS = {
  admin: '管理员',
  manager: '店长',
  clerk: '店员',
};

export const CAPABILITIES = {
  pricesRead: 'prices:read',
  pricesWrite: 'prices:write',
  usersWrite: 'users:write',
  auditRead: 'audit:read',
  passwordSelf: 'password:self',
  passwordReset: 'password:reset',
};

const ROLE_CAPABILITIES = {
  admin: new Set(Object.values(CAPABILITIES)),
  manager: new Set([
    CAPABILITIES.pricesRead,
    CAPABILITIES.pricesWrite,
    CAPABILITIES.auditRead,
    CAPABILITIES.passwordSelf,
  ]),
  clerk: new Set([
    CAPABILITIES.pricesRead,
    CAPABILITIES.passwordSelf,
  ]),
};

export function can(role, capability) {
  return ROLE_CAPABILITIES[role]?.has(capability) === true;
}

export function capabilitiesFor(role) {
  return Object.fromEntries(
    Object.values(CAPABILITIES).map((capability) => [capability, can(role, capability)]),
  );
}
