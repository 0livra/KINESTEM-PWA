# Auditoría DevOps y Partición de Commits Atómicos

### 1. Confirmación de Credenciales de Git

Se ejecutó la purga y configuración estricta de autoría en el entorno:

```text
git config user.name  -> hlima-2021464
git config user.email -> hlima-2021464@kinal.edu.gt
```

---

### 2. Partición Atómica de Commits (Ley Anti-Monolitos)

Los cambios fueron auditados y particionados individualmente de acuerdo con su dominio arquitectónico:

| Grupo | Scope | Archivos Afectados |
| :--- | :--- | :--- |
| **Grupo A (Configuraciones)** | `chore(workspace)` | `.gitignore` (exclusión de volcados temporales de repomix) |
| **Grupo C (Dominios/Módulos)** | `feat(shared-types)` | `packages/shared-types/src/index.ts` |
| **Grupo C (Dominios/Módulos)** | `feat(firmware)` | `firmware/arduinoMaestro/arduinoMaestro.ino` |
| **Grupo C (Dominios/Módulos)** | `feat(auth-users)` | `apps/backend/src/modules/auth-users/auth-users.repository.ts` |
| **Grupo C (Dominios/Módulos)** | `feat(hardware-gateway)` | `apps/backend/src/modules/hardware-gateway/hardware.protocol.ts`<br>`apps/backend/src/modules/hardware-gateway/serial.service.ts`<br>`apps/backend/src/modules/hardware-gateway/hardware.gateway.ts` |
| **Grupo E (Estado/Store)** | `refactor(store)` | `apps/frontend/src/store/hardware.slice.ts` |
| **Grupo B (Infraestructura)** | `feat(gateway-client)` | `apps/frontend/src/app/hardware/gateway-client.ts`<br>`apps/frontend/src/app/hooks/use-hardware-gateway.ts` |
| **Grupo D (UI/Vistas)** | `feat(router)` | `apps/frontend/src/app/root.tsx`<br>`apps/frontend/src/main.tsx` |
| **Grupo D (UI/Vistas)** | `feat(auth-pairing)` | `apps/frontend/src/app/routes/auth-pairing/route.tsx`<br>`apps/frontend/src/app/routes/auth-pairing/pairing-components.tsx` |
| **Grupo D (UI/Vistas)** | `feat(lobby)` | `apps/frontend/src/app/routes/lobby/route.tsx` |
| **Grupo D (UI/Vistas)** | `feat(arena)` | `apps/frontend/src/app/routes/arena/route.tsx` |
| **Grupo D (UI/Vistas)** | `feat(rewards-shop)` | `apps/frontend/src/app/routes/rewards-shop/route.tsx` |

---

### 3. Estado del Árbol de Trabajo

```text
On branch test
Your branch is ahead of 'origin/test' by 12 commits.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean
```

---

### 4. Historial Resultante (`git log --oneline -n 15`)

```text
6a5cae3 feat(rewards-shop): activar modo rfid en microcontrolador durante confirmacion de ganador
be60e73 feat(arena): redisenar ciclo de supervivencia, confirmacion ir y control de errores pixi
df902c5 feat(lobby): sincronizar modo de juego en hardware y soporte para inicio por control ir
176bcd7 feat(auth-pairing): habilitar atajos de contingencia y componente de entrada manual de pin
0e525ee feat(router): anadir limite de errores de ruta y registrar ruta de standby
8c6beb1 feat(gateway-client): implementar puente de teclado, espejo led y resincronizacion websocket
1043b0b refactor(store): robustecer captura de pulsos ir y blindaje de veredictos tardios
bbdaebc feat(hardware-gateway): optimizar protocolo serial, despacho por cola y sincronizacion de estados
ee2c6bb feat(auth-users): implementar pin fijo de emparejamiento para estacion fisica
64f8cda feat(firmware): agregar firmware de arduino maestro para gestion de perifericos y protocolo
8d4ce04 feat(shared-types): incorporar tipos de modos operativos y comandos de hardware
ac0cd75 chore(workspace): ignorar artefactos generados por repomix
a6b70a8 fix(hardware): conectar SerialService a COM6 con autodetección USB VID_2341 PID_0043 y sincronizar eventos LCD/Face
f6e9a96 feat(hardware-gateway): integracion de protocolo serial Arduino e implementacion de emparejamiento IR/RFID
9876fbd feat(analytics): incorporar tarjeta de identidad con avatar led y saldo
```
