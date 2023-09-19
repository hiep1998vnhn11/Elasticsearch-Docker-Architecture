# The Elasticsearch architecture for the Elasticsearch Server, ready for production

## Prerequire

- a VPS server, at least 4Gb of RAM
- ready docker and docker-compose, if not, please follow the [instructions](https://docs.docker.com/engine/install/ubuntu/)
- nodejs > 20.0 and pnpm latest version

## Start the elasticsearch on server

1.SSH into your server

```bash
ssh -i ~/.ssh/your_ssh_file.pem your-user@your-ip
```

2.Cd in your dir and clone this repository into this

```bash
git clone https://github.com/hiep1998vnhn11/Elasticsearch-Docker-Architecture
```

3.Start docker-compose

```bash
docker-compose up -d
```

4.Install nodejs dependencies

```bash
pnpm install
```

5.Start server

```bash
pnpm start
```

Or using pm2

```bash
pm2 start index.js --name elasticsearch-server
```

## Elastic node options

### Options

1.Single node:
Currently, the docker-compose.yml file is already in single node, nothing to do. Ready for development.

2.3-cluster architecture:
A production ready architecture. Need atleast of 12Gb RAM to run.

### Reasons why you might want to use three services for an Elasticsearch cluster:

- High availability: A three-node cluster provides high availability, meaning that the cluster will remain available even if one node fails. If a node fails, the other two nodes will be able to continue operating.
- Redundancy: A three-node cluster also provides redundancy, meaning that your data is protected even if one node fails. Each node in the cluster stores a copy of the data, so if one node fails, the data is still available on the other two nodes.
- Scalability: A three-node cluster is also scalable, meaning that you can add more nodes to the cluster as your needs grow. If you need to increase the capacity or performance of your cluster, you can simply add more nodes.
