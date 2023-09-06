import { db, eq, schema } from "@openstatus/db";

const { insertMonitorSchema, monitor } = schema;

/**
 * @swagger
 * /v1/monitors/{id}:
 *   get:
 *     summmary: Returns the monitor
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the monitors to get
 *     tags:
 *        - Monitors
 *     responses:
 *       200:
 *         description: The monitor
 *       404:
 *         description: No monitors were found
 *       500:
 *         description: Bad Request
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const _monitor = await db
      .select()
      .from(monitor)
      .where(eq(monitor.id, id))
      .get();

    if (!_monitor) {
      return new Response("Not Found", { status: 404 });
    }

    return new Response(JSON.stringify(_monitor), { status: 200 });
  } catch (e) {
    console.error(e);

    return new Response("Internal Error", { status: 500 });
  }
}

/**
 * @swagger
 * /v1/monitors/{id}:
 *   put:
 *     summmary: Update the monitor
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the monitors to get
 *     tags:
 *        - Monitors
 *     responses:
 *       200:
 *         description: The monitor
 *       404:
 *         description: No monitors were found
 *       500:
 *         description: Bad Request
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const _monitor = await db
      .select()
      .from(monitor)
      .where(eq(monitor.id, id))
      .get();

    if (!_monitor) {
      return new Response("Not Found", { status: 404 });
    }

    const json = await req.json();
    const _valid = insertMonitorSchema.partial().safeParse(json);

    if (!_valid.success) {
      return new Response(JSON.stringify(_valid.error), { status: 400 });
    }

    const { data } = _valid;
    const _newMonitor = await db
      .update(monitor)
      .set({
        ..._monitor,
        ...data,
        regions: (data || _monitor).regions?.join(","), // mapping array to string
        headers:
          data.headers || _monitor.headers
            ? JSON.parse(String((data || _monitor).headers))
            : undefined, // mapping JSON to string
      })
      .where(eq(monitor.id, id))
      .returning()
      .get();

    return new Response(JSON.stringify(_newMonitor), { status: 200 });
  } catch (e) {
    console.error(e);

    return new Response("Internal Error", { status: 500 });
  }
}

/**
 * @swagger
 * /v1/monitors/{id}:
 *   delete:
 *     summmary: Update the monitor
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the monitors to delete
 *     tags:
 *        - Monitors
 *     responses:
 *       200:
 *         description: The monitor
 *       404:
 *         description: No monitors were found
 *       500:
 *         description: Bad Request
 */
export async function DELETE(
  _: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const _monitor = await db
      .select()
      .from(monitor)
      .where(eq(monitor.id, id))
      .get();

    if (!_monitor) {
      return new Response("Not Found", { status: 404 });
    }

    await db.delete(monitor).where(eq(monitor.id, id)).run();

    return new Response("Deleted", { status: 200 });
  } catch (e) {
    console.log(e);

    return new Response("Internal Error", { status: 500 });
  }
}
