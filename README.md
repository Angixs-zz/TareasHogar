# Casa en orden · TareasHogar

Calendario compartido de limpieza, preparado para **GitHub Pages**. HTML, CSS y JavaScript sin framework, servidor ni base de datos. Se adapta a celulares y computadoras.

**Web:** https://angixs-zz.github.io/TareasHogar/

## Turnos confirmados

Inicio: **sábado 24 de octubre de 2026**. Cada turno cubre sábado y domingo.

- **Escaleras y pasillo:** Ángel → Jessy → Edgar → Santiago → Nubia. Barrer las escaleras y trapear el pasillo de arriba son una sola tarea.
- **Baño:** Fredy → Edgar → Santiago → Jessy → Ángel → Nubia.
- El primer fin de semana corresponde a **Ángel en escaleras** y **Fredy en baño**.
- Jessi/Jessy es la misma persona, mostrada como **Jessy**; Santi aparece como **Santiago**.

### Cómo se resuelven las coincidencias

La rotación de escaleras sigue su orden. Si una persona coincide en ambas tareas, se intercambia **únicamente el baño de esa semana con el baño de la siguiente**. La persona desplazada conserva su turno para el fin de semana siguiente. Ambos fines de semana muestran el motivo del intercambio.

El cálculo parte siempre de la fecha inicial: navegar a otro mes, recargar o abrir la página en otro dispositivo no modifica las asignaciones. Con estas rotaciones no se producen tareas dobles ni desplazamientos de más de una semana.

La equidad es **por tarea**, no por total: cada persona de escaleras participa una vez por cada 5 turnos; cada persona de baño participa una vez por cada 6 turnos de la secuencia base, con posibles intercambios adyacentes. Fredy solo participa en baño. En un período cerrado puede quedar un intercambio pendiente para la semana siguiente.

## Funciones

- Responsables del fin de semana actual; el domingo conserva el turno del sábado.
- Navegación mensual desde octubre de 2026 hasta diciembre de 2100.
- Filtro por persona, con el contexto de ambas tareas de sus fines de semana.
- Explicaciones de los intercambios y reparto de los primeros 30 fines de semana.
- Descarga `.ics` del mes visible, respetando el filtro de persona. Eventos de día completo que cubren sábado y domingo. El archivo es una copia para importar, no una suscripción sincronizada.
- Impresión del mes visible.
- Modo claro/oscuro con colores adaptados en tarjetas, turnos, controles y ventanas. Recuerda la preferencia en el dispositivo; la primera visita usa el tema del sistema.
- **Aviso listo para el grupo:** elegir uno de los próximos 8 fines de semana, revisar el mensaje y copiarlo o abrir un borrador en WhatsApp. Incluye intercambios y enlace al calendario; el usuario elige el destinatario y lo envía. Sustituye la cuadrícula mensual.
- Próximo turno de cada persona con cuenta regresiva, incluido el domingo en curso.

No requiere cuentas ni almacena información personal del visitante. La configuración es compartida en el código; no hay cambios locales que hagan que cada persona vea un calendario diferente. Las tipografías se cargan desde Google Fonts con fuentes de respaldo locales.

## Ejecutar localmente

Con Python 3 y Node.js 22 o superior:

```sh
npm start
```

Abrir http://localhost:8080. Es necesario servir los archivos por HTTP porque se usan módulos JavaScript.

```sh
npm test
```

Las pruebas verifican los turnos iniciales, 100 años sin coincidencias, conservación de turnos, equidad, estabilidad entre meses, fechas y exportación ICS. No es necesario instalar dependencias.

## Publicación

En GitHub, **Settings → Pages → Source → GitHub Actions**. El flujo `.github/workflows/pages.yml` comprueba las rotaciones y publica solo los archivos de la web con cada push a `main`. Un fallo de pruebas impide la publicación.

## Configuración compartida

`schedule.js` contiene los nombres, la fecha inicial y ambas rotaciones. Los cambios se publican haciendo commit y push. Cambiar el inicio o el orden recalcula también el histórico; no modificar estos valores para marcar tareas hechas. Las garantías actuales del intercambio están verificadas para las rotaciones de 5 y 6 personas indicadas arriba; si cambia la composición, revisar el algoritmo y las pruebas.
