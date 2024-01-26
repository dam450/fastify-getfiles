const fastify = require("fastify");
const fs = require("fs");
const archiver = require("archiver");
const path = require("node:path");
const { fastifyStatic } = require("@fastify/static");

// Função para preparar o arquivo ZIP
async function prepareZipFile(zipFileName) {
  // Conteúdo dos arquivos TXT
  const file1Content = new Date().toString();
  const file2Content = "Conteúdo do Arquivo 2";
  const file3Content = "Conteúdo do Arquivo 3";

  // Nome dos arquivos
  const file1Name = "arquivo1.txt";
  const file2Name = "arquivo2.txt";
  const file3Name = "arquivo3.txt";

  // Caminho onde os arquivos temporários serão salvos
  const tempDir = path.join(__dirname, "../", "public");

  // Criando arquivos temporários
  fs.writeFileSync(path.join(tempDir, file1Name), file1Content);
  fs.writeFileSync(path.join(tempDir, file2Name), file2Content);
  fs.writeFileSync(path.join(tempDir, file3Name), file3Content);

  // Lista de arquivos para compactar
  const filesToCompress = [file1Name, file2Name, file3Name];

  // Criando um arquivo ZIP
  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  // Criando um stream para o ZIP
  const zipStream = fs.createWriteStream(
    path.join(tempDir, `${zipFileName}.zip`)
  );

  // Pipe para o stream de resposta
  archive.pipe(zipStream);

  // Adicionando os arquivos ao ZIP
  filesToCompress.forEach((file) => {
    archive.file(path.join(tempDir, file), { name: file });
  });

  // Finalizando o arquivo ZIP
  archive.finalize();

  // Aguarde até que o arquivo ZIP seja criado
  await new Promise((resolve) => zipStream.on("close", resolve));

  // Removendo os arquivos temporários
  filesToCompress.forEach((file) => fs.unlinkSync(path.join(tempDir, file)));

  return true;
}

// Função que remove arquivo ZIP
function removeZipFile(zipFileName) {
  const tempDir = path.join(__dirname, "../", "public");
  fs.unlinkSync(path.join(tempDir, `${zipFileName}.zip`));
}

const serverStatus = (request, reply) => {
  reply.status(200).send({ message: "server is running!" });
};

const getFiles = (request, reply) => {
  // Definindo cabeçalhos de resposta
  reply.header("Content-Type", "application/zip");
  reply.header(
    "Content-Disposition",
    "attachment; filename=arquivos_compactados.zip"
  );

  prepareZipFile("arquivos_compactados")
    .then(() => {
      // Enviando o arquivo ZIP como resposta
      return reply.sendFile("arquivos_compactados.zip");
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      removeZipFile("arquivos_compactados");
    });
};

const app = fastify({ logger: false });

// rota estática para servir os arquivos
app.register(fastifyStatic, {
  root: path.join(__dirname, "../", "public"), // Caminho onde os arquivos temporários serão salvos
});

app.get("/", serverStatus);
app.get("/get-file", getFiles);

// Inicia o servidor
app.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Servidor escutando em ${address}`);
});
