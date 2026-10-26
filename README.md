# Casa en orden · TareasHogar

Calendario compartido de limpieza, preparado para **GitHub Pages**. HTML, CSS y JavaScript sin framework, servidor ni base de datos. Se adapta a celulares y computadoras.

**Web:** https://angixs-zz.github.io/TareasHogar/

## Turnos confirmados

Inicio: **sábado 24 de octubre de 2026**. Cada turno cubre sábado y domingo.

- **Escaleras y pasillo:** Ángel → Jessy → Edgar → Santiago → Nubia. Barrer las escaleras y trapear el pasillo de arriba son una sola tarea.
- **Baño:** Fredy → Edgar → Santiago → Jessy → Ángel → Nubia.
- **Barrer el corredor:** Nubia → Ángel → Jessy → Edgar → Fredy → Santiago.
- El primer fin de semana corresponde a **Ángel en escaleras**, **Fredy en baño** y **Nubia en el corredor**.
- Jessi/Jessy es la misma persona, mostrada como **Jessy**; Santi aparece como **Santiago**.

### Cómo se combinan las tareas

Cada tarea avanza su propia rotación. Si la persona que sigue ya tiene otra tarea ese fin de semana, se salta y conserva su turno para el siguiente hueco; la persona que la cubre se adelanta. Así **nadie hace dos tareas el mismo fin de semana** y nadie pierde su turno.

El cálculo parte siempre de la fecha inicial: navegar a otro mes, recargar o abrir la página en otro dispositivo no modifica las asignaciones. Las tareas se atienden en orden de prioridad (primero las originales y después las añadidas), por lo que agregar una tarea no altera los turnos ya calculados de las anteriores.

La equidad es **por tarea**, no por total: cada persona participa una vez por cada vuelta de la rotación de cada tarea. Fredy solo participa en baño y corredor. En un período cerrado puede quedar un ajuste pendiente para el fin de semana siguiente.

### Añadir tareas nuevas

En **Los próximos turnos → Añadir tarea** se puede crear una tarea con nombre, descripción, icono y participantes. Al guardarla, el calendario recalcula las combinaciones, el reparto, el aviso para el grupo y la descarga `.ics`.

Las tareas nuevas se guardan en `localStorage`, **solo en el dispositivo** donde se crean. Se pueden quitar con **Quitar** o volver a las originales con **Restaurar tareas originales**. Para que toda la casa vea una tarea nueva de forma permanente, hay que añadirla a `TASKS` en `schedule.js` y publicar el cambio.

Con las rotaciones actuales se pueden añadir hasta 2 tareas más (5 en total), porque escaleras incluye a 5 personas. En general, cada rotación debe incluir al menos tantas personas como tareas haya para garantizar que siempre quede alguien libre. El formulario valida esa condición antes de guardar.

### Consultar la equidad

En **Ver reparto** se elige un rango de fechas inclusivo. La tabla muestra, para cada persona, cuántos turnos tiene de cada tarea y el total; el **~** de cada columna es lo que corresponde por persona según esa rotación. Un fin de semana cuenta si cae total o parcialmente dentro del rango.

Al pulsar **Ver perfil** se abre el detalle de esa persona: total de tareas, comparación por tarea con lo esperado, reparto entre las demás personas de esa rotación y actividad por mes. También se puede abrir el perfil desde las tarjetas de **Próximo turno**. La comparación es por tarea porque las rotaciones no incluyen siempre a las mismas personas (Fredy, por ejemplo, no participa en escaleras).

## Funciones

- Responsables del fin de semana actual; el domingo conserva el turno del sábado.
- Navegación mensual desde octubre de 2026 hasta diciembre de 2100.
- Filtro por persona, con el contexto de todas las tareas de sus fines de semana.
- Columnas y tarjetas generadas dinámicamente para cualquier número de tareas.
- **Reparto por rango de fechas:** elegir «desde» y «hasta» (o usar los atajos de 30 fines de semana, mes, 6 meses y 1 año) y ver cuántas tareas tiene cada persona, con el total esperado por tarea.
- **Perfil por persona:** desde el reparto o desde su tarjeta de próximo turno, consultar el total de tareas en el rango, el detalle por tarea comparado con lo esperado, el reparto entre participantes y la actividad por mes.
- Descarga `.ics` del mes visible, respetando el filtro de persona. Eventos de día completo que cubren sábado y domingo. El archivo es una copia para importar, no una suscripción sincronizada.
- Impresión del mes visible.
- Modo claro/oscuro con colores adaptados en tarjetas, turnos, controles y ventanas. Recuerda la preferencia en el dispositivo; la primera visita usa el tema del sistema.
- **Aviso listo para el grupo:** elegir uno de los próximos 8 fines de semana, revisar el mensaje y copiarlo o abrir un borrador en WhatsApp. Incluye todas las tareas, los ajustes y el enlace al calendario.
- **Añadir tareas nuevas** desde la web, con cálculo automático de combinaciones y validación de rotaciones imposibles.
- Próximo turno de cada persona con cuenta regresiva, incluido el domingo en curso.

No requiere cuentas ni almacena información personal del visitante. La configuración base es compartida en el código; las tareas añadidas desde la web son locales a ese dispositivo. Las tipografías se cargan desde Google Fonts con fuentes de respaldo locales.

## Ejecutar localmente

Con Python 3 y Node.js 22 o superior:

```sh
npm start
```

Abrir http://localhost:8080. Es necesario servir los archivos por HTTP porque se usan módulos JavaScript.

```sh
npm test
```

Las pruebas verifican los turnos iniciales de las tres tareas, 100 años sin tareas dobles, conservación y equidad de los turnos, estabilidad entre meses, tareas añadidas, conteos por rango de fechas, validaciones, fechas y exportación ICS. No es necesario instalar dependencias.

## Publicación

En GitHub, **Settings → Pages → Source → GitHub Actions**. El flujo `.github/workflows/pages.yml` comprueba las rotaciones y publica solo los archivos de la web con cada push a `main`. Un fallo de pruebas impide la publicación.

## Configuración compartida

`schedule.js` contiene los nombres, la fecha inicial y las rotaciones dentro de `TASKS`. Los cambios se publican haciendo commit y push. Cambiar el inicio o el orden recalcula también el histórico; no modificar estos valores para marcar tareas hechas.

Para añadir una tarea permanente a la configuración compartida, agrega un objeto a `TASKS` con `id`, `name`, `short`, `description`, `icon`, `order`. El `order` debe incluir al menos tantas personas como tareas haya y no repetir personas. Las garantías del cálculo están verificadas para las rotaciones indicadas; si cambia la composición, revisar el algoritmo y las pruebas.
